"""
MPS Bee Shop Kiosk API Tests
Tests all backend endpoints: auth, items, sessions, students, reports
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


class TestAuthEndpoints:
    """Authentication endpoint tests - Google OAuth flow"""
    
    def test_auth_me_returns_401_when_not_authenticated(self, api_client):
        """GET /api/auth/me should return 401 when no session cookie"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        assert "Not authenticated" in data["detail"]
        print("✓ /api/auth/me returns 401 when not authenticated")
    
    def test_google_login_returns_auth_url(self, api_client):
        """GET /api/auth/google/login should return valid Google OAuth URL"""
        redirect_uri = "https://bee-tokens.preview.emergentagent.com"
        response = api_client.get(f"{BASE_URL}/api/auth/google/login?redirect_uri={redirect_uri}")
        assert response.status_code == 200
        data = response.json()
        assert "auth_url" in data
        auth_url = data["auth_url"]
        # Verify URL structure
        assert "accounts.google.com" in auth_url
        assert "client_id=" in auth_url
        assert "redirect_uri=" in auth_url
        assert "response_type=code" in auth_url
        assert "scope=" in auth_url
        # Verify redirect_uri is properly URL-encoded
        assert "bee-tokens.preview.emergentagent.com" in auth_url
        print(f"✓ /api/auth/google/login returns valid auth URL")
    
    def test_google_login_requires_redirect_uri(self, api_client):
        """GET /api/auth/google/login should return 400 without redirect_uri"""
        response = api_client.get(f"{BASE_URL}/api/auth/google/login")
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "redirect_uri" in data["detail"].lower()
        print("✓ /api/auth/google/login returns 400 without redirect_uri")
    
    def test_logout_works(self, api_client):
        """POST /api/auth/logout should return ok status"""
        response = api_client.post(f"{BASE_URL}/api/auth/logout")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ /api/auth/logout works correctly")


class TestItemsEndpoints:
    """Shop items CRUD tests"""
    
    def test_get_items_returns_list(self, api_client):
        """GET /api/items should return list of shop items"""
        response = api_client.get(f"{BASE_URL}/api/items")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify item structure
        item = data[0]
        assert "name" in item
        assert "cost" in item
        assert "category" in item
        print(f"✓ /api/items returns {len(data)} items")
    
    def test_create_item(self, api_client):
        """POST /api/items should create a new item"""
        item_data = {"name": "TEST_Brownie", "cost": 6, "category": "Menu Item"}
        response = api_client.post(f"{BASE_URL}/api/items", json=item_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ POST /api/items creates item successfully")
    
    def test_create_duplicate_item_fails(self, api_client):
        """POST /api/items should fail for duplicate name"""
        item_data = {"name": "TEST_Brownie", "cost": 7, "category": "Menu Item"}
        response = api_client.post(f"{BASE_URL}/api/items", json=item_data)
        assert response.status_code == 400
        data = response.json()
        assert "already exists" in data.get("detail", "").lower()
        print("✓ POST /api/items rejects duplicate item")
    
    def test_update_item(self, api_client):
        """PUT /api/items/{name} should update item"""
        response = api_client.put(f"{BASE_URL}/api/items/TEST_Brownie", json={"cost": 8})
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ PUT /api/items/{name} updates item")
    
    def test_update_nonexistent_item_fails(self, api_client):
        """PUT /api/items/{name} should return 404 for nonexistent item"""
        response = api_client.put(f"{BASE_URL}/api/items/NONEXISTENT_ITEM_XYZ", json={"cost": 5})
        assert response.status_code == 404
        print("✓ PUT /api/items/{name} returns 404 for nonexistent item")
    
    def test_delete_item(self, api_client):
        """DELETE /api/items/{name} should delete item"""
        response = api_client.delete(f"{BASE_URL}/api/items/TEST_Brownie")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        # Verify deletion
        get_response = api_client.get(f"{BASE_URL}/api/items")
        items = get_response.json()
        assert not any(i["name"] == "TEST_Brownie" for i in items)
        print("✓ DELETE /api/items/{name} deletes item and verifies removal")
    
    def test_delete_nonexistent_item_fails(self, api_client):
        """DELETE /api/items/{name} should return 404 for nonexistent item"""
        response = api_client.delete(f"{BASE_URL}/api/items/NONEXISTENT_ITEM_XYZ")
        assert response.status_code == 404
        print("✓ DELETE /api/items/{name} returns 404 for nonexistent item")


class TestSessionsEndpoints:
    """Session management tests"""
    
    def test_get_sessions_returns_list(self, api_client):
        """GET /api/sessions should return list of sessions"""
        response = api_client.get(f"{BASE_URL}/api/sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            session = data[0]
            assert "label" in session
            assert "date" in session
            assert "active" in session
        print(f"✓ /api/sessions returns {len(data)} sessions")
    
    def test_get_active_session(self, api_client):
        """GET /api/sessions/active should return active session or null"""
        response = api_client.get(f"{BASE_URL}/api/sessions/active")
        assert response.status_code == 200
        data = response.json()
        if data is not None:
            assert "label" in data
            assert data.get("active") == True
        print("✓ /api/sessions/active returns active session")
    
    def test_create_session(self, api_client):
        """POST /api/sessions should create and activate new session"""
        session_data = {"label": "TEST_Session_Pytest"}
        response = api_client.post(f"{BASE_URL}/api/sessions", json=session_data)
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        assert data.get("label") == "TEST_Session_Pytest"
        # Verify it's now active
        active_response = api_client.get(f"{BASE_URL}/api/sessions/active")
        active_data = active_response.json()
        assert active_data.get("label") == "TEST_Session_Pytest"
        print("✓ POST /api/sessions creates and activates session")
    
    def test_activate_session(self, api_client):
        """PUT /api/sessions/{label}/activate should activate session"""
        # First get list of sessions
        sessions_response = api_client.get(f"{BASE_URL}/api/sessions")
        sessions = sessions_response.json()
        if len(sessions) > 1:
            # Find a non-active session
            inactive = next((s for s in sessions if not s.get("active")), None)
            if inactive:
                response = api_client.put(f"{BASE_URL}/api/sessions/{inactive['label']}/activate")
                assert response.status_code == 200
                data = response.json()
                assert data.get("status") == "ok"
                print(f"✓ PUT /api/sessions/{{label}}/activate activates session")
                return
        print("✓ PUT /api/sessions/{label}/activate - skipped (no inactive sessions)")
    
    def test_activate_nonexistent_session_fails(self, api_client):
        """PUT /api/sessions/{label}/activate should return 404 for nonexistent"""
        response = api_client.put(f"{BASE_URL}/api/sessions/NONEXISTENT_SESSION_XYZ/activate")
        assert response.status_code == 404
        print("✓ PUT /api/sessions/{label}/activate returns 404 for nonexistent")
    
    def test_delete_session(self, api_client):
        """DELETE /api/sessions/{label} should delete session"""
        response = api_client.delete(f"{BASE_URL}/api/sessions/TEST_Session_Pytest")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "ok"
        print("✓ DELETE /api/sessions/{label} deletes session")


class TestStudentsEndpoints:
    """Student data tests - students now return as objects {name, photo_url?}"""
    
    def test_get_students_returns_grouped_data_with_objects(self, api_client):
        """GET /api/students should return students grouped by class as objects with 'name' field"""
        response = api_client.get(f"{BASE_URL}/api/students")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Each key is a class, value is list of student objects
        for class_name, students in data.items():
            assert isinstance(students, list)
            for student in students:
                # NEW: Students are now objects with 'name' field (not plain strings)
                assert isinstance(student, dict), f"Student should be object, got {type(student)}"
                assert "name" in student, "Student object must have 'name' field"
                assert isinstance(student["name"], str), "Student name must be string"
                # photo_url is optional
                if "photo_url" in student:
                    assert isinstance(student["photo_url"], str)
        print(f"✓ /api/students returns {len(data)} classes with student objects (name field)")


class TestReportEndpoints:
    """Report data tests"""
    
    def test_get_report_all_sessions(self, api_client):
        """GET /api/report?session=all should return aggregated report"""
        response = api_client.get(f"{BASE_URL}/api/report?session=all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Each key is a class with summary and students
        for class_name, class_data in data.items():
            assert "summary" in class_data
            assert "students" in class_data
            summary = class_data["summary"]
            assert "total_earned" in summary
            assert "total_spent" in summary
            assert "total_saved" in summary
        print("✓ /api/report returns aggregated report data")
    
    def test_get_item_report(self, api_client):
        """GET /api/report/items should return item popularity"""
        response = api_client.get(f"{BASE_URL}/api/report/items?session=all")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            item = data[0]
            assert "name" in item
            assert "count" in item
            assert "total_cost" in item
        print(f"✓ /api/report/items returns {len(data)} items in popularity order")
    
    def test_get_student_balances(self, api_client):
        """GET /api/report/balances should return cumulative balance data per student"""
        response = api_client.get(f"{BASE_URL}/api/report/balances")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            balance = data[0]
            # Verify balance structure
            assert "class_name" in balance, "Balance must have class_name"
            assert "student" in balance, "Balance must have student"
            assert "total_earned" in balance, "Balance must have total_earned"
            assert "total_spent" in balance, "Balance must have total_spent"
            assert "total_saved" in balance, "Balance must have total_saved"
            assert "session_count" in balance, "Balance must have session_count"
            # Verify types
            assert isinstance(balance["total_earned"], int)
            assert isinstance(balance["total_spent"], int)
            assert isinstance(balance["total_saved"], int)
            assert isinstance(balance["session_count"], int)
        print(f"✓ /api/report/balances returns {len(data)} student balances")


class TestSessionsDateField:
    """Test that sessions have date field for filtering"""
    
    def test_sessions_have_date_field(self, api_client):
        """GET /api/sessions should return sessions with date field"""
        response = api_client.get(f"{BASE_URL}/api/sessions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            session = data[0]
            assert "date" in session, "Session must have date field"
            # Date should be in YYYY-MM-DD format
            date_str = session["date"]
            assert len(date_str) == 10, f"Date should be YYYY-MM-DD format, got {date_str}"
            assert date_str[4] == "-" and date_str[7] == "-", f"Date format invalid: {date_str}"
        print(f"✓ /api/sessions returns sessions with date field")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
