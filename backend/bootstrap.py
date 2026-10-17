"""App bootstrap — run before other backend imports."""

import logging
import os

# ChromaDB telemetry (must be set before chromadb is imported anywhere)
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"] = "false"

# Silence ChromaDB telemetry log spam if posthog still misbehaves
logging.getLogger("chromadb.telemetry.product.posthog").setLevel(logging.CRITICAL)
logging.getLogger("chromadb.telemetry").setLevel(logging.CRITICAL)
