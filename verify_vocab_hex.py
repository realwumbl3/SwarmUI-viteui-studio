import gzip
with open("src/srcdata/Tokensets/t5.txt.gz", "rb") as f:
    content = gzip.decompress(f.read()).replace(b"\r", b"")
    lines = content.split(b"\n")
    print(f"Total lines in t5.txt.gz: {len(lines)}")
    if len(lines) > 0:
        print(f"First 5 tokens: {lines[:5]}")
        print(f"Last 5 tokens: {lines[-5:]}")
