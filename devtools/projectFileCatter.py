# Run python projectFileCatter.py {absolute repo dir} .tsx .ts
# ie: python projectFileCatter.py "H:\DevFolder\client" .tsx .ts

import os
import fnmatch
import argparse
from pathlib import Path

def parse_gitignore(directory):
    gitignore_path = Path(directory) / '.gitignore'
    ignored_patterns = ['node_modules/']

    if gitignore_path.exists():
        with open(gitignore_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    ignored_patterns.append(line)

    return ignored_patterns

def is_ignored(file_path, ignored_patterns, base_dir):
    relative_path = os.path.relpath(file_path, base_dir)
    for pattern in ignored_patterns:
        if fnmatch.fnmatch(relative_path, pattern) or fnmatch.fnmatch(os.path.basename(file_path), pattern):
            return True
        if pattern.endswith('/') and relative_path.startswith(pattern):
            return True
    return False

def find_and_print_files(directory, extensions):
    ignored_patterns = parse_gitignore(directory)
    output_file = Path(__file__).parent / 'prompt_prefix.txt'

    with open(output_file, 'w', encoding='utf-8') as out_f:
        for root, _, files in os.walk(directory):
            if 'node_modules' in root.split(os.sep):
                continue
            for file in files:
                file_path = os.path.join(root, file)
                if is_ignored(file_path, ignored_patterns, directory):
                    continue
                if any(file.endswith(ext) for ext in extensions):
                    relative_path = os.path.relpath(file_path, directory)
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                            contents = f.read()
                        output_text = f"The code in file {relative_path} is: ```{contents}```\n"
                        print(output_text)
                        out_f.write(output_text + '\n')
                    except Exception as e:
                        print(f"Could not read {relative_path}: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Find and print contents of files with given extensions.")
    parser.add_argument("directory", type=str, help="The directory to search")
    parser.add_argument("extensions", type=str, nargs='+', help="File extensions to search for (e.g. .py .js)")

    args = parser.parse_args()
    find_and_print_files(args.directory, args.extensions)