#!/usr/bin/bash

# This script updates the JSR version in the jsr.json file.
# Usage: ./update-jsr-version.sh <new_version>


if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <new_version>"
    exit 1
fi

NEW_VERSION=$1

# Check if the version format is valid (basic check), 0.1.0 or 1.0.0-beta or 0.7.0-<branch>.20251002002
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
    echo "Error: Invalid version format. Expected format: X.Y.Z or X.Y.Z-suffix"
    exit 1
fi

JSR_FILE="jsr.json"

if [ ! -f "$JSR_FILE" ]; then
    echo "Error: $JSR_FILE not found!"
    exit 1
fi

# Update the version in jsr.json
sed -i.bak -E "s/\"version\": \"[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?\"/\"version\": \"$NEW_VERSION\"/" "$JSR_FILE"
rm "$JSR_FILE.bak"

echo "Updated JSR version to $NEW_VERSION in $JSR_FILE"
