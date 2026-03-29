#!/usr/bin/env python3

import json
import os
import sys
import urllib.error
import urllib.request


def fail(message: str) -> None:
    print(message, file=sys.stderr)
    sys.exit(1)


def flatten_messages(mapping: dict) -> str:
    chunks = []
    for _, node in mapping.items():
        message = node.get("message") or {}
        author = ((message.get("author") or {}).get("role")) or "unknown"
        content = message.get("content") or {}
        parts = content.get("parts") or []
        text_parts = [part for part in parts if isinstance(part, str) and part.strip()]
        if text_parts:
            chunks.append(f"{author.upper()}: " + "\n".join(text_parts))
    return "\n\n".join(chunks)


def post_document(url: str, headers: dict, payload: dict) -> None:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST",
    )
    with urllib.request.urlopen(req) as response:
        response.read()


def main() -> None:
    if len(sys.argv) != 2:
        fail("Usage: python3 scripts/import_chatgpt_export.py /path/to/conversations.json")

    export_path = sys.argv[1]
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_key:
        fail("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.")

    with open(export_path, "r", encoding="utf-8") as handle:
        conversations = json.load(handle)

    endpoint = (
        f"{supabase_url}/rest/v1/knowledge_documents"
        "?on_conflict=source,source_doc_id"
    )
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }

    imported = 0
    for conversation in conversations:
        source_doc_id = str(conversation.get("id") or "").strip()
        title = str(conversation.get("title") or "ChatGPT Conversation").strip()
        mapping = conversation.get("mapping") or {}
        content = flatten_messages(mapping)

        if not source_doc_id or not content:
            continue

        payload = {
            "source": "chatgpt",
            "source_doc_id": source_doc_id,
            "title": title,
            "content": content[:120000],
            "metadata": {
                "create_time": conversation.get("create_time"),
                "update_time": conversation.get("update_time"),
            },
        }

        try:
            post_document(endpoint, headers, payload)
            imported += 1
        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8")
            fail(f"Supabase error for {title}: {body}")

    print(f"Imported {imported} ChatGPT conversations.")


if __name__ == "__main__":
    main()
