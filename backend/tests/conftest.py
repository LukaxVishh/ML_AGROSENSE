import sys
from pathlib import Path

# Garante que o diretório backend esteja no sys.path para importação de app.*
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))
