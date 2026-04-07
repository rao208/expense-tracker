#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Expense Tracker
Tests all endpoints according to test_result.md requirements
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://smart-spend-sort.preview.emergentagent.com/api"

class ExpenseTrackerTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.test_results = []
        self.created_expense_ids = []
        self.created_rule_ids = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
    
    def test_root_endpoint(self):
        """Test the root API endpoint"""
        try:
            response = requests.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Root endpoint", True, f"Response: {data}")
                else:
                    self.log_test("Root endpoint", False, "Missing message in response")
            else:
                self.log_test("Root endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Root endpoint", False, f"Exception: {str(e)}")
    
    def test_categories_endpoint(self):
        """Test GET /api/categories"""
        try:
            response = requests.get(f"{self.base_url}/categories")
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    # Check if default categories are present
                    category_ids = [cat.get("id") for cat in categories]
                    expected_categories = ["food", "transport", "shopping", "bills", "entertainment", "healthcare", "income", "others"]
                    missing = [cat for cat in expected_categories if cat not in category_ids]
                    if not missing:
                        self.log_test("Categories endpoint", True, f"Found {len(categories)} categories")
                    else:
                        self.log_test("Categories endpoint", False, f"Missing categories: {missing}")
                else:
                    self.log_test("Categories endpoint", False, "Empty or invalid categories list")
            else:
                self.log_test("Categories endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Categories endpoint", False, f"Exception: {str(e)}")
    
    def test_parse_sms_debit(self):
        """Test POST /api/parse-sms with debit SMS"""
        try:
            sms_body = "Rs.500.00 debited from A/c XX1234 to Swiggy on 15/07/25. Avl Bal: Rs.25000.00"
            response = requests.post(
                f"{self.base_url}/parse-sms",
                json={"sms_body": sms_body}
            )
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["success", "amount", "transaction_type", "merchant", "suggested_category_id"]
                missing_fields = [field for field in expected_fields if field not in data]
                
                if not missing_fields:
                    if (data["success"] and 
                        data["amount"] == 500.0 and 
                        data["transaction_type"] == "debit" and
                        data["merchant"] and "swiggy" in data["merchant"].lower()):
                        self.log_test("Parse SMS - Debit", True, f"Parsed: {data}")
                    else:
                        self.log_test("Parse SMS - Debit", False, f"Incorrect parsing: {data}")
                else:
                    self.log_test("Parse SMS - Debit", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Parse SMS - Debit", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Parse SMS - Debit", False, f"Exception: {str(e)}")
    
    def test_parse_sms_credit(self):
        """Test POST /api/parse-sms with credit SMS"""
        try:
            sms_body = "INR 1,200 credited to your A/c XX5678 from Salary. Avl Bal: INR 50,000"
            response = requests.post(
                f"{self.base_url}/parse-sms",
                json={"sms_body": sms_body}
            )
            
            if response.status_code == 200:
                data = response.json()
                if (data["success"] and 
                    data["amount"] == 1200.0 and 
                    data["transaction_type"] == "credit"):
                    self.log_test("Parse SMS - Credit", True, f"Parsed: {data}")
                else:
                    self.log_test("Parse SMS - Credit", False, f"Incorrect parsing: {data}")
            else:
                self.log_test("Parse SMS - Credit", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Parse SMS - Credit", False, f"Exception: {str(e)}")
    
    def test_parse_sms_invalid(self):
        """Test POST /api/parse-sms with invalid SMS (no debit/credit keywords)"""
        try:
            sms_body = "Your OTP is 123456"
            response = requests.post(
                f"{self.base_url}/parse-sms",
                json={"sms_body": sms_body}
            )
            
            if response.status_code == 200:
                data = response.json()
                if not data["success"] and data.get("error"):
                    self.log_test("Parse SMS - Invalid", True, f"Correctly rejected: {data}")
                else:
                    self.log_test("Parse SMS - Invalid", False, f"Should have failed: {data}")
            else:
                self.log_test("Parse SMS - Invalid", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Parse SMS - Invalid", False, f"Exception: {str(e)}")
    
    def test_create_expense(self):
        """Test POST /api/expenses"""
        try:
            expense_data = {
                "amount": 500,
                "category_id": "food",
                "description": "Test expense",
                "transaction_type": "debit",
                "source": "manual"
            }
            response = requests.post(
                f"{self.base_url}/expenses",
                json=expense_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if ("id" in data and 
                    data["amount"] == 500 and 
                    data["category_id"] == "food"):
                    self.created_expense_ids.append(data["id"])
                    self.log_test("Create expense", True, f"Created expense ID: {data['id']}")
                else:
                    self.log_test("Create expense", False, f"Invalid response: {data}")
            else:
                self.log_test("Create expense", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Create expense", False, f"Exception: {str(e)}")
    
    def test_get_expenses(self):
        """Test GET /api/expenses"""
        try:
            response = requests.get(f"{self.base_url}/expenses")
            
            if response.status_code == 200:
                expenses = response.json()
                if isinstance(expenses, list):
                    self.log_test("Get expenses", True, f"Retrieved {len(expenses)} expenses")
                else:
                    self.log_test("Get expenses", False, "Response is not a list")
            else:
                self.log_test("Get expenses", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get expenses", False, f"Exception: {str(e)}")
    
    def test_get_expenses_with_filter(self):
        """Test GET /api/expenses with category filter"""
        try:
            response = requests.get(f"{self.base_url}/expenses?category_id=food")
            
            if response.status_code == 200:
                expenses = response.json()
                if isinstance(expenses, list):
                    # Check if all expenses have food category
                    food_expenses = [exp for exp in expenses if exp.get("category_id") == "food"]
                    if len(food_expenses) == len(expenses):
                        self.log_test("Get expenses with filter", True, f"Retrieved {len(expenses)} food expenses")
                    else:
                        self.log_test("Get expenses with filter", False, "Filter not working correctly")
                else:
                    self.log_test("Get expenses with filter", False, "Response is not a list")
            else:
                self.log_test("Get expenses with filter", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get expenses with filter", False, f"Exception: {str(e)}")
    
    def test_get_expense_summary(self):
        """Test GET /api/expenses/summary/totals"""
        try:
            response = requests.get(f"{self.base_url}/expenses/summary/totals")
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["total_debit", "total_credit", "balance", "category_totals"]
                missing_fields = [field for field in expected_fields if field not in data]
                
                if not missing_fields:
                    self.log_test("Expense summary", True, f"Summary: {data}")
                else:
                    self.log_test("Expense summary", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Expense summary", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Expense summary", False, f"Exception: {str(e)}")
    
    def test_create_keyword_rule(self):
        """Test POST /api/keyword-rules"""
        try:
            rule_data = {
                "keyword": "netflix",
                "category_id": "entertainment"
            }
            response = requests.post(
                f"{self.base_url}/keyword-rules",
                json=rule_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if ("id" in data and 
                    data["keyword"] == "netflix" and 
                    data["category_id"] == "entertainment"):
                    self.created_rule_ids.append(data["id"])
                    self.log_test("Create keyword rule", True, f"Created rule ID: {data['id']}")
                else:
                    self.log_test("Create keyword rule", False, f"Invalid response: {data}")
            else:
                self.log_test("Create keyword rule", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Create keyword rule", False, f"Exception: {str(e)}")
    
    def test_duplicate_keyword_rule(self):
        """Test POST /api/keyword-rules with duplicate keyword"""
        try:
            rule_data = {
                "keyword": "netflix",  # Same as previous test
                "category_id": "entertainment"
            }
            response = requests.post(
                f"{self.base_url}/keyword-rules",
                json=rule_data
            )
            
            if response.status_code == 400:
                self.log_test("Duplicate keyword rule rejection", True, "Correctly rejected duplicate")
            else:
                self.log_test("Duplicate keyword rule rejection", False, f"Should have returned 400, got {response.status_code}")
        except Exception as e:
            self.log_test("Duplicate keyword rule rejection", False, f"Exception: {str(e)}")
    
    def test_get_keyword_rules(self):
        """Test GET /api/keyword-rules"""
        try:
            response = requests.get(f"{self.base_url}/keyword-rules")
            
            if response.status_code == 200:
                rules = response.json()
                if isinstance(rules, list):
                    self.log_test("Get keyword rules", True, f"Retrieved {len(rules)} rules")
                else:
                    self.log_test("Get keyword rules", False, "Response is not a list")
            else:
                self.log_test("Get keyword rules", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Get keyword rules", False, f"Exception: {str(e)}")
    
    def test_custom_keyword_affects_parsing(self):
        """Test that custom keyword rules affect SMS parsing"""
        try:
            # First create a custom rule for uber -> transport
            rule_data = {
                "keyword": "uber",
                "category_id": "transport"
            }
            rule_response = requests.post(
                f"{self.base_url}/keyword-rules",
                json=rule_data
            )
            
            if rule_response.status_code == 200:
                rule_id = rule_response.json()["id"]
                self.created_rule_ids.append(rule_id)
                
                # Now test SMS parsing with uber
                sms_body = "Rs.250.00 debited from A/c XX1234 to Uber on 15/07/25. Avl Bal: Rs.25000.00"
                parse_response = requests.post(
                    f"{self.base_url}/parse-sms",
                    json={"sms_body": sms_body}
                )
                
                if parse_response.status_code == 200:
                    data = parse_response.json()
                    if (data["success"] and 
                        data["suggested_category_id"] == "transport"):
                        self.log_test("Custom keyword affects parsing", True, f"Uber correctly categorized as transport")
                    else:
                        self.log_test("Custom keyword affects parsing", False, f"Expected transport category, got: {data.get('suggested_category_id')}")
                else:
                    self.log_test("Custom keyword affects parsing", False, f"Parse failed: {parse_response.status_code}")
            else:
                self.log_test("Custom keyword affects parsing", False, f"Rule creation failed: {rule_response.status_code}")
        except Exception as e:
            self.log_test("Custom keyword affects parsing", False, f"Exception: {str(e)}")
    
    def test_delete_expense(self):
        """Test DELETE /api/expenses/{id}"""
        if not self.created_expense_ids:
            self.log_test("Delete expense", False, "No expense ID available for deletion")
            return
        
        try:
            expense_id = self.created_expense_ids[0]
            response = requests.delete(f"{self.base_url}/expenses/{expense_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Delete expense", True, f"Deleted expense {expense_id}")
                    self.created_expense_ids.remove(expense_id)
                else:
                    self.log_test("Delete expense", False, "Missing success message")
            else:
                self.log_test("Delete expense", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Delete expense", False, f"Exception: {str(e)}")
    
    def test_delete_keyword_rule(self):
        """Test DELETE /api/keyword-rules/{id}"""
        if not self.created_rule_ids:
            self.log_test("Delete keyword rule", False, "No rule ID available for deletion")
            return
        
        try:
            rule_id = self.created_rule_ids[0]
            response = requests.delete(f"{self.base_url}/keyword-rules/{rule_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Delete keyword rule", True, f"Deleted rule {rule_id}")
                    self.created_rule_ids.remove(rule_id)
                else:
                    self.log_test("Delete keyword rule", False, "Missing success message")
            else:
                self.log_test("Delete keyword rule", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Delete keyword rule", False, f"Exception: {str(e)}")
    
    def cleanup(self):
        """Clean up created test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete remaining expenses
        for expense_id in self.created_expense_ids:
            try:
                requests.delete(f"{self.base_url}/expenses/{expense_id}")
                print(f"   Deleted expense {expense_id}")
            except:
                pass
        
        # Delete remaining keyword rules
        for rule_id in self.created_rule_ids:
            try:
                requests.delete(f"{self.base_url}/keyword-rules/{rule_id}")
                print(f"   Deleted rule {rule_id}")
            except:
                pass
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test order matters for dependencies
        self.test_root_endpoint()
        self.test_categories_endpoint()
        
        # SMS parsing tests
        self.test_parse_sms_debit()
        self.test_parse_sms_credit()
        self.test_parse_sms_invalid()
        
        # Expense CRUD tests
        self.test_create_expense()
        self.test_get_expenses()
        self.test_get_expenses_with_filter()
        self.test_get_expense_summary()
        
        # Keyword rule tests
        self.test_create_keyword_rule()
        self.test_duplicate_keyword_rule()
        self.test_get_keyword_rules()
        self.test_custom_keyword_affects_parsing()
        
        # Deletion tests
        self.test_delete_expense()
        self.test_delete_keyword_rule()
        
        # Cleanup
        self.cleanup()
        
        # Summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if total - passed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   • {result['test']}: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = ExpenseTrackerTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)