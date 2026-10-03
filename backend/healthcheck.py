"""Container-only probe: bounded timeout, no proxy environment or diagnostics."""
import sys
from urllib.request import ProxyHandler, build_opener


if __name__ == '__main__':
    probe = sys.argv[1] if len(sys.argv) == 2 else 'live'
    if probe not in {'live', 'ready'}:
        raise SystemExit(2)
    try:
        with build_opener(ProxyHandler({})).open(
                f'http://127.0.0.1:8000/api/health/{probe}/', timeout=4) as response:
            raise SystemExit(0 if response.status == 200 else 1)
    except Exception:
        raise SystemExit(1) from None
