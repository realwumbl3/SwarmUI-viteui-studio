using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using System.Text;

// Minimal shim for Logs and StringConversionHelper if needed, or just mock them
public static class Logs {
    public static void Info(string m) => Console.WriteLine("INFO: " + m);
    public static void Verbose(string m) => Console.WriteLine("VERBOSE: " + m);
}

public static class StringConversionHelper {
    public static Encoding UTF8Encoding = Encoding.UTF8;
}

// Copy of CliplikeTokenizer for testing
public partial class CliplikeTokenizer
{
    public string[] Tokens;
    public bool IsSentencePiece;
    public bool CaseSensitive;
    public record struct TokenData(int ID, string Piece);
    public List<TokenData>[] DataMap = new List<TokenData>[128 * 128];
    public ConcurrentDictionary<string, int[]> Cache = new();

    public static int GetIndex(string word)
    {
        int c1 = Math.Min((int)word[0], 127);
        int c2 = word.Length > 1 ? Math.Min((int)word[1], 127) : 0;
        return c1 * 128 + c2;
    }

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
        Tokens = Encoding.UTF8.GetString(data).Replace("\r", "").Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Logs.Info($"Loading {fname}, found {Tokens.Length} tokens.");
        for (int i = 0; i < DataMap.Length; i++) { DataMap[i] = []; }
        for (int i = 0; i < Tokens.Length; i++)
        {
            string token = Tokens[i];
            DataMap[GetIndex(token)].Add(new TokenData(i, token));
            if (token.Length == 1)
            {
                int baseIndex = GetIndex(token);
                for (int x = 1; x < 128; x++) { DataMap[baseIndex + x].Add(new TokenData(i, token)); }
            }
        }
        for (int i = 0; i < DataMap.Length; i++) { DataMap[i] = [.. DataMap[i].OrderByDescending(t => t.Piece.Length)]; }
    }

    public int[] EncodeWord(string word)
    {
        if (string.IsNullOrEmpty(word)) return [];
        if (Cache is not null && Cache.TryGetValue(word, out int[] cached)) return cached;
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
            if (!found) remaining = remaining[1..];
        }
        int[] final = [.. result];
        if (Cache is not null && word.Length < 128) Cache[word] = final;
        return final;
    }

    public record struct Token(int ID, float Weight);
    public Token[] Encode(string text, float weight = 1)
    {
        List<Token> output = [];
        string processedText = CaseSensitive ? text : text.ToLowerInvariant();
        if (IsSentencePiece)
        {
            string spText = "\u2581" + processedText.Replace(" ", "\u2581");
            foreach (int token in EncodeWord(spText)) { output.Add(new(token, weight)); }
        }
        return [.. output];
    }
}

class Program {
    static void Main() {
        CliplikeTokenizer tokenizer = new();
        tokenizer.IsSentencePiece = true;
        tokenizer.CaseSensitive = true;
        tokenizer.Load("src/srcdata/Tokensets/t5.txt.gz");
        
        string testText = "Discord\nDiscord";
        var tokens = tokenizer.Encode(testText);
        Console.WriteLine($"Encoding '{testText.Replace("\n", "\\n")}': {tokens.Length} tokens");
        foreach (var t in tokens) {
            Console.WriteLine($"  ID {t.ID}: '{tokenizer.Tokens[t.ID].Replace("\n", "\\n")}'");
        }
    }
}
