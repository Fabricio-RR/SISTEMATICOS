import urllib.request
import urllib.parse
import json

BASE = "http://localhost:8000"

def test_endpoints():
    print("Logging in...")
    data = json.dumps({
        "correo": "admin@olimpiadas.pe",
        "contrasena": "Admin1234!"
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE}/api/auth/login",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            token = res_data["access_token"]
            print("Login successful.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Check Avanzar Torneo 4
    print("Testing Avanzar Torneo 4...")
    req = urllib.request.Request(
        f"{BASE}/api/torneos/4/avanzar",
        headers=headers,
        method="PATCH"
    )
    try:
        with urllib.request.urlopen(req) as res:
            print(f"PATCH /api/torneos/4/avanzar status: {res.status}")
            print(f"PATCH /api/torneos/4/avanzar body: {res.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"PATCH /api/torneos/4/avanzar HTTP error: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"PATCH /api/torneos/4/avanzar error: {e}")

    # Check Delete Fixture 4
    print("Testing Delete Fixture 4...")
    req = urllib.request.Request(
        f"{BASE}/api/fixture/4",
        headers=headers,
        method="DELETE"
    )
    try:
        with urllib.request.urlopen(req) as res:
            print(f"DELETE /api/fixture/4 status: {res.status}")
            print(f"DELETE /api/fixture/4 body: {res.read().decode('utf-8')}")
    except urllib.error.HTTPError as e:
        print(f"DELETE /api/fixture/4 HTTP error: {e.code} - {e.read().decode('utf-8')}")
    except Exception as e:
        print(f"DELETE /api/fixture/4 error: {e}")

if __name__ == "__main__":
    test_endpoints()
