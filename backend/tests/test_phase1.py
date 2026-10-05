import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """Test health endpoint returns 200 OK."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "llm_provider" in data

def test_chat_schema_validation():
    """Test that /api/chat enforces valid payload schema."""
    # Empty message should fail validation
    response = client.post("/api/chat", json={"message": ""})
    assert response.status_code == 422

def test_chat_endpoint_structure():
    """Test /api/chat structure with valid payload."""
    payload = {
        "message": "Hello, explain what is an API in one sentence.",
        "conversation_id": "test-convo-123"
    }
    response = client.post("/api/chat", json=payload)
    # Even without a live API key in test runner, it should return 200 with fallback or completion
    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert data["conversation_id"] == "test-convo-123"
    assert "model" in data
