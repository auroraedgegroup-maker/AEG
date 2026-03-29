#!/usr/bin/env python3

import json
import os
import pathlib
import subprocess
import sys
import tempfile
from typing import Dict, Iterable, List, Tuple


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def flatten_messages(mapping: Dict) -> str:
    chunks: List[str] = []
    for node in mapping.values():
      message = node.get("message") or {}
      author = ((message.get("author") or {}).get("role")) or "unknown"
      content = message.get("content") or {}
      parts = content.get("parts") or []
      text_parts = [part.strip() for part in parts if isinstance(part, str) and part.strip()]
      if text_parts:
          chunks.append(f"{author.upper()}: " + "\n".join(text_parts))
    return "\n\n".join(chunks)


def run_command(command: List[str], input_text: str = "") -> str:
    result = subprocess.run(
        command,
        input=input_text,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        fail(result.stderr.strip() or result.stdout.strip() or "Command failed")
    return result.stdout.strip()


def upload_document(bucket: str, key: str, body: str, region: str) -> None:
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as handle:
        handle.write(body)
        temp_path = handle.name

    try:
        run_command(
            [
                "aws",
                "s3",
                "cp",
                temp_path,
                f"s3://{bucket}/{key}",
                "--region",
                region,
            ]
        )
    finally:
        pathlib.Path(temp_path).unlink(missing_ok=True)


def put_item(table_name: str, item: Dict, region: str) -> None:
    run_command(
        [
            "aws",
            "dynamodb",
            "put-item",
            "--table-name",
            table_name,
            "--item",
            json.dumps(item),
            "--region",
            region,
        ]
    )


def build_item(conversation: Dict, bucket: str, key: str, body: str) -> Dict:
    conversation_id = str(conversation.get("id") or "").strip()
    title = str(conversation.get("title") or "ChatGPT Conversation").strip()
    updated_at = str(conversation.get("update_time") or conversation.get("create_time") or "")
    content_preview = body[:600].replace("\n", " ")

    return {
        "pk": {"S": "SOURCE#chatgpt"},
        "sk": {"S": f"DOC#{conversation_id}"},
        "gsi1pk": {"S": "TYPE#chatgpt-conversation"},
        "gsi1sk": {"S": updated_at or conversation_id},
        "source": {"S": "chatgpt"},
        "source_doc_id": {"S": conversation_id},
        "title": {"S": title},
        "s3_bucket": {"S": bucket},
        "s3_key": {"S": key},
        "updated_at": {"S": updated_at},
        "content_preview": {"S": content_preview},
    }


def main() -> None:
    if len(sys.argv) != 4:
        fail(
            "Usage: python3 scripts/import_chatgpt_export_to_aws.py /path/to/conversations.json BUCKET_NAME TABLE_NAME"
        )

    export_path, bucket_name, table_name = sys.argv[1], sys.argv[2], sys.argv[3]
    region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION") or "us-east-1"

    with open(export_path, "r", encoding="utf-8") as handle:
        conversations = json.load(handle)

    imported = 0
    for conversation in conversations:
        conversation_id = str(conversation.get("id") or "").strip()
        if not conversation_id:
            continue

        flattened = flatten_messages(conversation.get("mapping") or {})
        if not flattened:
            continue

        title = str(conversation.get("title") or "ChatGPT Conversation").strip()
        key = f"chatgpt/{conversation_id}.md"
        body = f"# {title}\n\n{flattened}\n"
        upload_document(bucket_name, key, body, region)
        put_item(table_name, build_item(conversation, bucket_name, key, body), region)
        imported += 1

    print(f"Imported {imported} ChatGPT conversations into AWS.")


if __name__ == "__main__":
    main()
