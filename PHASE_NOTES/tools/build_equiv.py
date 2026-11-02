"""Python equivalent of scripts/build-static.mjs (Node is not installed on this machine).
Same allow-list, same sources, same final regex check. NOT the Node build: documented as such.
usage: py -3 -B -I build_equiv.py <project_root>
"""
import os, re, shutil, sys

root = os.path.abspath(sys.argv[1])
out = os.path.join(root, "dist")
os.makedirs(out, exist_ok=True)
ALLOW = re.compile(r"\.(js|css|svg|png|webp|woff2|wasm)$")
# Licence / provenance files that must travel with vendored third-party code (only inside assets/myelin/vendor).
VENDOR_DOC = re.compile(r"^(LICENSE|AUTHORS|MANIFEST\.json)$")

def copy_tree(src, dst, vendor=False):
    os.makedirs(dst, exist_ok=True)
    for name in sorted(os.listdir(src)):
        s, d = os.path.join(src, name), os.path.join(dst, name)
        if os.path.isdir(s):
            copy_tree(s, d, vendor or name == "vendor")
        elif ALLOW.search(name) or (vendor and VENDOR_DOC.match(name)):
            shutil.copyfile(s, d)

shutil.copyfile(os.path.join(root, "templates", "myelin_web_sample.html"), os.path.join(out, "index.html"))
shutil.copyfile(os.path.join(root, "templates", "myelin_web_sample.html"), os.path.join(out, "myelin_web_sample.html"))
copy_tree(os.path.join(root, "templates", "assets", "myelin"), os.path.join(out, "assets", "myelin"))
shutil.copyfile(os.path.join(root, "templates", "_headers"), os.path.join(out, "_headers"))

files = []
for d, _, fs in os.walk(out):
    for f in fs:
        files.append(os.path.relpath(os.path.join(d, f), out).replace("\\", "/"))
pat = re.compile(r"^(index\.html|myelin_web_sample\.html|_headers|assets/myelin/[\w/.-]+\.(js|css|svg|png|webp|woff2|wasm)|assets/myelin/vendor/[\w/.-]+/(LICENSE|AUTHORS)|assets/myelin/vendor/[\w/.-]+/MANIFEST\.json|assets/myelin/vendor/sqlite/MANIFEST\.json)$")
bad = [f for f in files if not pat.match(f)]
if bad:
    raise SystemExit("Unexpected publish file: " + ", ".join(bad))
print(f"Static output: {out}\nApproved files: {len(files)}")
