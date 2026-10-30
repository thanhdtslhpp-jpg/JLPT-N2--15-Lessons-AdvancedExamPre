import os
import glob
import json
import sys
import subprocess

try:
    from chromium_reader.localstorage import LocalStorageReader
except ImportError:
    print("[*] Installing chromium-reader...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "chromium-reader"])
    from chromium_reader.localstorage import LocalStorageReader

def find_candidate_leveldb_dirs():
    patterns = [
        # Google Chrome
        r'%LOCALAPPDATA%\Google\Chrome\User Data\Default\Local Storage\leveldb',
        r'%LOCALAPPDATA%\Google\Chrome\User Data\Profile *\Local Storage\leveldb',
        # Microsoft Edge
        r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Local Storage\leveldb',
        r'%LOCALAPPDATA%\Microsoft\Edge\User Data\Profile *\Local Storage\leveldb',
        # Brave
        r'%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Local Storage\leveldb',
        r'%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Profile *\Local Storage\leveldb',
        # Opera
        r'%APPDATA%\Opera Software\Opera Stable\Local Storage\leveldb',
    ]
    found = []
    for pat in patterns:
        expanded = os.path.expandvars(pat)
        matches = glob.glob(expanded)
        found.extend(matches)
    return found

def export_all_jlpt_data():
    dirs = find_candidate_leveldb_dirs()
    print(f"[*] Found {len(dirs)} browser profile leveldb directories.")
    
    merged_data = {}
    found_keys = 0
    
    for d in dirs:
        if not os.path.exists(d):
            continue
        try:
            with LocalStorageReader(d) as reader:
                for rec in reader.records():
                    k = rec.script_key
                    if k and (k.startswith("jlpt_") or "jlpt" in k):
                        v = rec.value
                        merged_data[k] = v
                        found_keys += 1
                        print(f"  + Extracted [{k}] from {os.path.basename(os.path.dirname(os.path.dirname(d)))}")
        except Exception:
            pass

    base_dir = os.path.dirname(os.path.abspath(__file__))
    out_json = os.path.join(base_dir, "user_data.json")
    out_js = os.path.join(base_dir, "user_data.js")

    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)

    with open(out_js, "w", encoding="utf-8") as f:
        f.write("// Tu dong tao boi export_user_data.py\n")
        f.write("window.JLPT_SYNC_DATA = ")
        json.dump(merged_data, f, ensure_ascii=False, indent=2)
        f.write(";\n")

    print("=" * 60)
    print(f"[SUCCESS] Exported {len(merged_data)} JLPT keys!")
    print(f"1. {out_json}")
    print(f"2. {out_js}")
    print("Google Drive will now automatically sync these files to your other computers!")
    print("=" * 60)
    return out_json

if __name__ == "__main__":
    export_all_jlpt_data()
