
import re

def patient_doc_id(name):
    if not name:
        return ""
    return re.sub(r"[^a-z0-9_\-]", "_", name.strip().lower())
