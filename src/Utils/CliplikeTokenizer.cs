using FreneticUtilities.FreneticToolkit;
using System.IO;
using System.IO.Compression;
using System.Text.RegularExpressions;

namespace SwarmUI.Utils;

/// <summary>This class can interpret a CLIP-like token set and tokenize it properly (compatible/equivalent with OpenCLIP tokenization results).</summary>
public partial class CliplikeTokenizer
{
    /// <summary>The raw array of tokens, wherein a numerical index corresponds to the Token ID.</summary>
    public string[] Tokens;

    /// <summary>If true, this tokenizer is using SentencePiece style (T5, etc) where spaces are represented by ' ' prefix.</summary>
    public bool IsSentencePiece;

    /// <summary>If true, this tokenizer is case-sensitive.</summary>
    public bool CaseSensitive;

    /// <summary>A small struct of data about a token.</summary>
    /// <param name="ID">The numerical ID for the token.</param>
    /// <param name="Piece">The text-piece string this token represents.</param>
    public record struct TokenData(int ID, string Piece);

    /// <summary>Optimized dense lookup table optimization trick.</summary>
    public List<TokenData>[] DataMap = new List<TokenData>[128 * 128];

    /// <summary>Cache of already-computed tokenizations (for words, not complete texts).</summary>
    public ConcurrentDictionary<string, int[]> Cache = new();

    /// <summary>Gets the lookup-table optimization index for a given piece of text.</summary>
    public static int GetIndex(string word)
    {
        int c1 = Math.Min((int)word[0], 127);
        int c2 = word.Length > 1 ? Math.Min((int)word[1], 127) : 0;
        return c1 * 128 + c2;
    }

    /// <summary>Causes this instance to immediately load and process the tokenset data at the given filepath. Can be a '.txt' or a '.txt.gz'.</summary>
    public void Load(string fname)
    {
        byte[] data = File.ReadAllBytes(fname);
        if (fname.EndsWith(".gz"))
        {
            using MemoryStream inStream = new(data);
            using GZipStream gZipStream = new(inStream, CompressionMode.Decompress);
            using MemoryStream outStream = new();
            gZipStream.CopyTo(outStream);
            data = outStream.ToArray();
        }
        Tokens = StringConversionHelper.UTF8Encoding.GetString(data).Replace("\r", "").Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Logs.Info($"[CliplikeTokenizer] Loading {fname}, found {Tokens.Length} tokens.");
        for (int i = 0; i < DataMap.Length; i++)
        {
            DataMap[i] = [];
        }
        for (int i = 0; i < Tokens.Length; i++)
        {
            string token = Tokens[i];
            DataMap[GetIndex(token)].Add(new TokenData(i, token));
            if (token.Length == 1) // Ensure multi-letter words still read single-letter tokens
            {
                int baseIndex = GetIndex(token);
                for (int x = 1; x < 128; x++)
                {
                    DataMap[baseIndex + x].Add(new TokenData(i, token));
                }
            }
        }
        for (int i = 0; i < DataMap.Length; i++)
        {
            DataMap[i] = [.. DataMap[i].OrderByDescending(t => t.Piece.Length)];
        }
    }

    /// <summary>Creates and returns the token ID set encoding for a given single word.</summary>
    public int[] EncodeWord(string word)
    {
        if (string.IsNullOrEmpty(word))
        {
            return [];
        }
        if (Cache is not null && Cache.TryGetValue(word, out int[] cached))
        {
            return cached;
        }
        List<int> result = [];
        string remaining = word;
        while (remaining.Length > 0)
        {
            int bucketIdx = GetIndex(remaining);
            IEnumerable<TokenData> tokens = DataMap[bucketIdx];
            bool found = false;
            foreach (TokenData token in tokens)
            {
                if (token.Piece.Length <= remaining.Length && remaining.StartsWith(token.Piece))
                {
                    result.Add(token.ID);
                    remaining = remaining[token.Piece.Length..];
                    found = true;
                    break;
                }
            }
            if (!found)
            {
                // Fallback: if no token matches, skip one character to avoid infinite loop
                remaining = remaining[1..];
            }
        }
        if (result.Count == 0 && !string.IsNullOrEmpty(word))
        {
            Logs.Info($"[CliplikeTokenizer] Warning: EncodeWord for '{word}' matched ZERO tokens.");
        }
        int[] final = [.. result];
        if (Cache is not null && word.Length < 128) // Only cache reasonably sized words
        {
            Cache[word] = final;
        }
        return final;
    }

    /// <summary>Compiler-generated-regex for <see cref="Splitter"/>.</summary>
    [GeneratedRegex("'s|'t|'re|'ve|'m|'ll|'d|[\\p{L}]+|[\\p{N}]|[^\\s\\p{L}\\p{N}]+", RegexOptions.Compiled)]
    private static partial Regex GenSplitter();
    /// <summary>Special regex (matches OpenCLIP source) for where '/w' splitters should apply.</summary>
    public static Regex Splitter = GenSplitter();

    /// <summary>Holds the data for an encoded token.</summary>
    /// <param name="ID">The token ID.</param>
    /// <param name="Weight">The token weight.</param>
    public record struct Token(int ID, float Weight);

    /// <summary>Encodes a given chunk of text, and returns the raw encoded token set.</summary>
    public Token[] Encode(string text, float weight = 1, bool fixParens = false)
    {
        if (fixParens)
        {
            text = text.Replace("\\(", "(").Replace("\\)", ")");
        }
        List<Token> output = [];
        string processedText = CaseSensitive ? text : text.ToLowerInvariant();
        if (IsSentencePiece)
        {
            // SentencePiece (T5) style: spaces are '\u2581', and there's usually a leading space
            string spText = "\u2581" + processedText.Replace(" ", "\u2581");
            foreach (int token in EncodeWord(spText))
            {
                output.Add(new(token, weight));
            }
        }
        else
        {
            foreach (string word in Splitter.Matches(processedText).Select(m => m.Value))
            {
                if (!string.IsNullOrWhiteSpace(word))
                {
                    foreach (int token in EncodeWord(word + "</w>"))
                    {
                        output.Add(new(token, weight));
                    }
                }
            }
        }
        return [.. output];
    }

    /// <summary>Encodes a given chunk of text (with parenthetical weight parsing), and returns the raw encoded token set.
    /// <para>Uses ComfyUI-style weighting.</para></summary>
    public Token[] EncodeWithWeighting(string text, float weight = 1)
    {
        int depth = 0;
        char[] data = [.. text];
        int start = 0;
        int parenStart = 0;
        List<Token> output = [];
        for (int i = 0; i < data.Length; i++)
        {
            char c = data[i];
            if (c == '(' && (i == 0 || data[i - 1] != '\\'))
            {
                depth++;
                if (depth == 1)
                {
                    parenStart = i;
                }
            }
            else if (c == ')' && depth > 0 && (i == 0 || data[i - 1] != '\\'))
            {
                depth--;
                if (depth == 0)
                {
                    string prefix = text[start..parenStart];
                    if (!string.IsNullOrWhiteSpace(prefix))
                    {
                        output.AddRange(Encode(prefix, weight, true));
                    }
                    start = parenStart;
                    string paren = text[(start + 1)..i];
                    if (!string.IsNullOrWhiteSpace(paren))
                    {
                        int lastColon = paren.LastIndexOf(':');
                        if (lastColon != -1 && float.TryParse(paren[(lastColon + 1)..], out float subWeight))
                        {
                            paren = paren[..lastColon];
                        }
                        else
                        {
                            subWeight = weight * 1.1f;
                        }
                        output.AddRange(EncodeWithWeighting(paren, subWeight));
                        start = i + 1;
                    }
                }
            }
        }
        if (start < text.Length)
        {
            output.AddRange(Encode(text[start..], weight, true));
        }
        return [.. output];
    }
}
