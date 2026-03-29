#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TOOLS_DIR="$ROOT_DIR/.tools"
BIN_DIR="$TOOLS_DIR/bin"
TMP_DIR="$TOOLS_DIR/tmp"
AWS_BASE_DIR="$HOME/.local"
AWS_INSTALL_ROOT="$AWS_BASE_DIR/aws-cli"
AWS_SYMLINK_TARGET="$AWS_INSTALL_ROOT/aws"
AWS_COMPLETER_TARGET="$AWS_INSTALL_ROOT/aws_completer"
CHOICES_XML="$TMP_DIR/aws_choices.xml"
PKG_PATH="$TMP_DIR/AWSCLIV2.pkg"

mkdir -p "$BIN_DIR" "$TMP_DIR" "$AWS_BASE_DIR"

cat > "$CHOICES_XML" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <array>
    <dict>
      <key>choiceAttribute</key>
      <string>customLocation</string>
      <key>attributeSetting</key>
      <string>$AWS_BASE_DIR</string>
      <key>choiceIdentifier</key>
      <string>default</string>
    </dict>
  </array>
</plist>
EOF

curl -fsSL "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "$PKG_PATH"

installer -pkg "$PKG_PATH" \
  -target CurrentUserHomeDirectory \
  -applyChoiceChangesXML "$CHOICES_XML"

if [[ ! -x "$AWS_SYMLINK_TARGET" ]]; then
  echo "Expected AWS CLI binary not found at $AWS_SYMLINK_TARGET" >&2
  exit 1
fi

ln -sf "$AWS_SYMLINK_TARGET" "$BIN_DIR/aws"

if [[ -x "$AWS_COMPLETER_TARGET" ]]; then
  ln -sf "$AWS_COMPLETER_TARGET" "$BIN_DIR/aws_completer"
fi

cat <<EOF
AWS CLI installed.

Use it with:
  source "$ROOT_DIR/scripts/use_tools.sh"
  aws --version
EOF
