import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("Testing Color City API...")
    
    # 1. Register User
    print("\n--- Registering User ---")
    user_data = {"username": "testuser_v2", "password": "testpassword"}
    r = requests.post(f"{BASE_URL}/users/register", json=user_data)
    print(f"Status: {r.status_code}")
    print(r.json())

    # 2. Login
    print("\n--- Logging in ---")
    login_data = {"username": "testuser_v2", "password": "testpassword"}
    r = requests.post(f"{BASE_URL}/users/login", data=login_data)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        token = r.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        print(f"Token received: {bool(token)}")

        # 3. Get User Info
        print("\n--- Getting User Info ---")
        r = requests.get(f"{BASE_URL}/users/me", headers=headers)
        print(f"Status: {r.status_code}")
        print(r.json())
    else:
        print("Login failed, skipping auth tests.")

    # 4. Get Colors Paginated
    print("\n--- Getting Colors (Page 1, Size 5) ---")
    r = requests.get(f"{BASE_URL}/colors/?page=1&size=5")
    print(f"Status: {r.status_code}")
    print(r.json())

    # 5. Get Random Colors
    print("\n--- Getting Random Colors (Count 3) ---")
    random_req = {"count": 3, "exclude_ids": []}
    r = requests.post(f"{BASE_URL}/colors/random", json=random_req)
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        random_colors = r.json()
        for color in random_colors:
            print(f"ID: {color['id']}, Name: {color['name']}, Hex: {color['hex_code']}")
            
        # 6. Get Random Colors with Exclusion
        print("\n--- Getting Random Colors (Exclude previous IDs) ---")
        exclude_ids = [c["id"] for c in random_colors]
        random_req_ex = {"count": 2, "exclude_ids": exclude_ids}
        r = requests.post(f"{BASE_URL}/colors/random", json=random_req_ex)
        print(f"Status: {r.status_code}")
        for color in r.json():
            print(f"ID: {color['id']}, Name: {color['name']}, Hex: {color['hex_code']}")

if __name__ == "__main__":
    try:
        requests.get(BASE_URL)
    except requests.exceptions.ConnectionError:
        print("Error: The FastAPI server is not running. Please start it with 'uvicorn main:app --reload'")
        sys.exit(1)
        
    test_api()
