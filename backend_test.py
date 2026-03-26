import requests
import sys
from datetime import datetime

class BeeShopAPITester:
    def __init__(self, base_url="https://bee-tokens.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_students_api(self):
        """Test /api/students - should return students grouped by class"""
        print("\n" + "="*50)
        print("TESTING STUDENTS API")
        print("="*50)
        
        success, response = self.run_test(
            "Get Students Grouped by Class",
            "GET",
            "students",
            200
        )
        
        if success:
            # Check if we have the expected classes
            expected_classes = ['4A', '4B', '5A', '5B']
            for cls in expected_classes:
                if cls in response:
                    print(f"   ✅ Found class {cls} with {len(response[cls])} students")
                else:
                    print(f"   ⚠️  Missing expected class {cls}")
        
        return success

    def test_items_api(self):
        """Test /api/items - should return 8 seeded items"""
        print("\n" + "="*50)
        print("TESTING ITEMS API")
        print("="*50)
        
        success, response = self.run_test(
            "Get Items",
            "GET",
            "items",
            200
        )
        
        if success:
            print(f"   Found {len(response)} items")
            if len(response) >= 8:
                print("   ✅ Has expected 8+ items")
            else:
                print(f"   ⚠️  Expected 8+ items, found {len(response)}")
            
            # Show first few items
            for i, item in enumerate(response[:3]):
                print(f"   Item {i+1}: {item.get('name')} - {item.get('cost')} tokens ({item.get('category')})")
        
        return success

    def test_sessions_api(self):
        """Test sessions APIs"""
        print("\n" + "="*50)
        print("TESTING SESSIONS API")
        print("="*50)
        
        # Test get all sessions
        success1, sessions = self.run_test(
            "Get All Sessions",
            "GET",
            "sessions",
            200
        )
        
        # Test get active session
        success2, active_session = self.run_test(
            "Get Active Session",
            "GET",
            "sessions/active",
            200
        )
        
        if success2 and active_session:
            print(f"   Active session: {active_session.get('label')}")
            if active_session.get('label') == 'Term 1 Week 8':
                print("   ✅ Found expected active session 'Term 1 Week 8'")
            else:
                print(f"   ⚠️  Expected 'Term 1 Week 8', found '{active_session.get('label')}'")
        
        return success1 and success2

    def test_transactions_api(self):
        """Test transactions APIs"""
        print("\n" + "="*50)
        print("TESTING TRANSACTIONS API")
        print("="*50)
        
        # First get active session for testing
        _, active_session = self.run_test(
            "Get Active Session for Transaction Test",
            "GET",
            "sessions/active",
            200
        )
        
        if not active_session:
            print("   ⚠️  No active session found, skipping transaction tests")
            return False
        
        session_label = active_session.get('label')
        
        # Test creating a transaction
        test_transaction = {
            "class": "4A",
            "student": "Test Student",
            "earned": 10,
            "spent": 5,
            "items": [{"name": "Chocolate Bar", "cost": 5}],
            "session_label": session_label
        }
        
        success1, response = self.run_test(
            "Create Transaction",
            "POST",
            "transactions",
            200,
            data=test_transaction
        )
        
        if success1:
            saved = response.get('saved')
            print(f"   Transaction saved with {saved} tokens saved")
        
        # Test get used pairs
        success2, used_pairs = self.run_test(
            "Get Used Pairs",
            "GET",
            "transactions/used",
            200,
            params={"session": session_label}
        )
        
        if success2:
            print(f"   Found {len(used_pairs)} used student-class pairs")
        
        return success1 and success2

    def test_reports_api(self):
        """Test reports APIs"""
        print("\n" + "="*50)
        print("TESTING REPORTS API")
        print("="*50)
        
        # Test general report
        success1, report = self.run_test(
            "Get Report (All Sessions)",
            "GET",
            "report",
            200,
            params={"session": "all"}
        )
        
        if success1:
            print(f"   Report contains {len(report)} classes")
            for cls, data in report.items():
                summary = data.get('summary', {})
                print(f"   Class {cls}: {summary.get('student_count')} students, {summary.get('total_earned')} earned, {summary.get('total_spent')} spent")
        
        # Test item popularity report
        success2, item_report = self.run_test(
            "Get Item Popularity Report",
            "GET",
            "report/items",
            200,
            params={"session": "all"}
        )
        
        if success2:
            print(f"   Item report contains {len(item_report)} items")
            # Check if sorted by count desc
            if len(item_report) > 1:
                first_count = item_report[0].get('count', 0)
                second_count = item_report[1].get('count', 0)
                if first_count >= second_count:
                    print("   ✅ Items sorted by count (descending)")
                else:
                    print("   ⚠️  Items may not be sorted correctly")
            
            # Show top 3 items
            for i, item in enumerate(item_report[:3]):
                print(f"   #{i+1}: {item.get('name')} - {item.get('count')} purchases, {item.get('total_cost')} total cost")
        
        return success1 and success2

    def test_student_import_api(self):
        """Test student import API"""
        print("\n" + "="*50)
        print("TESTING STUDENT IMPORT API")
        print("="*50)
        
        # Test importing students
        test_students = [
            {"class": "4A", "student": "Test Student 1"},
            {"class": "4A", "student": "Test Student 2"},
            {"class": "4B", "student": "Test Student 3"}
        ]
        
        success, response = self.run_test(
            "Import Students",
            "POST",
            "students/import",
            200,
            data=test_students
        )
        
        if success:
            count = response.get('count')
            print(f"   Imported {count} students successfully")
        
        return success

    def test_student_skip_api(self):
        """Test student skip API"""
        print("\n" + "="*50)
        print("TESTING STUDENT SKIP API")
        print("="*50)
        
        # Test skipping a student
        skip_data = {
            "class": "4A",
            "student": "Test Student 1"
        }
        
        success, response = self.run_test(
            "Skip Student",
            "POST",
            "students/skip",
            200,
            data=skip_data
        )
        
        return success

def main():
    print("🐝 MPS Bee Shop Kiosk API Testing")
    print("="*60)
    
    tester = BeeShopAPITester()
    
    # Run all tests
    tests = [
        tester.test_students_api,
        tester.test_items_api,
        tester.test_sessions_api,
        tester.test_transactions_api,
        tester.test_reports_api,
        tester.test_student_import_api,
        tester.test_student_skip_api
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
            tester.failed_tests.append(f"Exception in {test.__name__}: {str(e)}")
    
    # Print final results
    print("\n" + "="*60)
    print("FINAL RESULTS")
    print("="*60)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.failed_tests:
        print(f"\n❌ Failed tests:")
        for failure in tester.failed_tests:
            print(f"   - {failure}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n🎯 Success rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())