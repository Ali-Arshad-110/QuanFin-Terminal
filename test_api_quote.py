import requests
import json

def test_api_quote(ticker):
    url = f"http://localhost:8000/api/v1/quote/{ticker}"
    print(f"Requesting: {url}")
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print("Error:", response.text)
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    test_api_quote("RELIANCE")
