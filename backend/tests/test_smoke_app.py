def test_docs_endpoint_is_available(client):
    response = client.get("/docs")
    assert response.status_code == 200
    assert "Swagger UI" in response.text


def test_me_requires_auth(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
