"""
Integration tests for API endpoints
Tests the actual FastAPI routes
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


class TestInventoryEndpoints:
    """Test inventory API endpoints"""

    def test_get_inventory_returns_200(self):
        response = client.get("/api/v1/inventory")
        assert response.status_code == 200

    def test_get_inventory_has_vehicles(self):
        response = client.get("/api/v1/inventory")
        data = response.json()
        assert "vehicles" in data
        assert "total" in data
        assert isinstance(data["vehicles"], list)

    def test_get_inventory_filter_by_body_style(self):
        response = client.get("/api/v1/inventory?body_style=Truck")
        data = response.json()
        assert response.status_code == 200
        for vehicle in data["vehicles"]:
            assert vehicle["bodyStyle"] == "Truck"

    def test_get_inventory_filter_by_fuel_type(self):
        response = client.get("/api/v1/inventory?fuel_type=Electric")
        data = response.json()
        assert response.status_code == 200
        for vehicle in data["vehicles"]:
            assert vehicle["fuelType"] == "Electric"

    def test_get_inventory_price_range(self):
        response = client.get("/api/v1/inventory?min_price=40000&max_price=60000")
        data = response.json()
        assert response.status_code == 200
        for vehicle in data["vehicles"]:
            assert 40000 <= vehicle["price"] <= 60000

    def test_get_featured_vehicles(self):
        response = client.get("/api/v1/inventory/featured")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 8

    def test_get_inventory_stats(self):
        response = client.get("/api/v1/inventory/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "byBodyStyle" in data
        assert "priceRange" in data

    def test_get_available_models(self):
        response = client.get("/api/v1/inventory/models")
        assert response.status_code == 200
        data = response.json()
        assert "models" in data

    def test_search_inventory(self):
        response = client.get("/api/v1/inventory/search?q=Silverado")
        assert response.status_code == 200
        data = response.json()
        assert "vehicles" in data
        assert "query" in data

    def test_search_requires_query(self):
        response = client.get("/api/v1/inventory/search")
        assert response.status_code == 422

    def test_get_vehicle_by_id_not_found(self):
        response = client.get("/api/v1/inventory/v999999")
        assert response.status_code == 404

    def test_get_vehicle_by_vin_not_found(self):
        response = client.get("/api/v1/inventory/vin/INVALIDVIN123")
        assert response.status_code == 404


class TestRecommendationEndpoints:
    """Test recommendation API endpoints"""

    def test_recommendations_vehicle_not_found(self):
        response = client.get("/api/v1/recommendations/v999999")
        assert response.status_code == 404

    def test_personalized_recommendations_empty_history(self):
        response = client.post(
            "/api/v1/recommendations/personalized",
            json={"viewedVehicles": []}
        )
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data
        assert data["basedOn"] == "featured"

    def test_preferences_recommendations(self):
        response = client.post(
            "/api/v1/recommendations/preferences",
            json={"bodyStyle": "Truck", "priceMax": 60000}
        )
        assert response.status_code == 200
        data = response.json()
        assert "recommendations" in data

    def test_preferences_filter_applied(self):
        response = client.post(
            "/api/v1/recommendations/preferences",
            json={"bodyStyle": "Truck"}
        )
        data = response.json()
        for vehicle in data["recommendations"]:
            assert vehicle["bodyStyle"] == "Truck"


class TestHealthEndpoints:
    """Test health and status endpoints"""

    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "Quirk AI Kiosk API"
        assert data["status"] == "running"

    def test_health_check(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        # Status is "healthy" with ANTHROPIC_API_KEY set, "degraded" without it (e.g. CI)
        assert data["status"] in ("healthy", "degraded")
        assert "timestamp" in data

    def test_health_check_structure(self):
        """Verify health check returns all expected fields"""
        response = client.get("/api/health")
        data = response.json()
        assert "service" in data
        assert "version" in data
        assert "checks" in data
        assert isinstance(data["checks"], dict)
