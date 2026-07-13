import json
from datetime import date, timedelta

from django.contrib.auth.models import User
from django.test import Client, TestCase

from .models import EWasteRequest, UserProfile


class AuthAndRequestTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_register_login_and_create_request(self):
        response = self.client.post(
            "/api/auth/register/",
            data=json.dumps(
                {
                    "first_name": "Student",
                    "last_name": "One",
                    "email": "student1@example.com",
                    "password": "StrongPass123!",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(UserProfile.objects.get(user__email="student1@example.com").role, UserProfile.ROLE_USER)

        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": "student1@example.com", "password": "StrongPass123!"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["first_name"], "Student")

        pickup_date = (date.today() + timedelta(days=1)).isoformat()
        response = self.client.post(
            "/api/requests/",
            data=json.dumps(
                {
                    "item_type": "Laptop",
                    "quantity": 1,
                    "pickup_address": "Stone Town",
                    "pickup_date": pickup_date,
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "pending")

    def test_admin_can_list_collectors(self):
        admin_user = User.objects.create_user(username="admin1", password="StrongPass123!")
        admin_profile = UserProfile.objects.get(user=admin_user)
        admin_profile.role = UserProfile.ROLE_ADMIN
        admin_profile.save()

        collector_user = User.objects.create_user(username="collector1", password="StrongPass123!")
        collector_profile = UserProfile.objects.get(user=collector_user)
        collector_profile.role = UserProfile.ROLE_COLLECTOR
        collector_profile.save()

        self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "admin1", "password": "StrongPass123!"}),
            content_type="application/json",
        )
        response = self.client.get("/api/collectors/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_admin_can_register_collector(self):
        admin_user = User.objects.create_user(username="admin2", password="StrongPass123!")
        admin_profile = UserProfile.objects.get(user=admin_user)
        admin_profile.role = UserProfile.ROLE_ADMIN
        admin_profile.save()

        self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "admin2", "password": "StrongPass123!"}),
            content_type="application/json",
        )

        response = self.client.post(
            "/api/collectors/register/",
            data=json.dumps(
                {
                    "first_name": "Col",
                    "last_name": "Lector",
                    "email": "collectornew@example.com",
                    "password": "StrongPass123!",
                    "phone": "12345",
                    "address": "Stone Town",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 201)
        collector = User.objects.get(email="collectornew@example.com")
        self.assertEqual(collector.profile.role, UserProfile.ROLE_COLLECTOR)

    def test_non_admin_cannot_register_collector(self):
        user = User.objects.create_user(username="user1", password="StrongPass123!")
        profile = UserProfile.objects.get(user=user)
        profile.role = UserProfile.ROLE_USER
        profile.save()

        self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "user1", "password": "StrongPass123!"}),
            content_type="application/json",
        )
        response = self.client.post(
            "/api/collectors/register/",
            data=json.dumps(
                {
                    "first_name": "Col",
                    "last_name": "Lector",
                    "email": "blockedcollector@example.com",
                    "password": "StrongPass123!",
                }
            ),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_profile_fields_can_be_cleared(self):
        user = User.objects.create_user(
            username="profile@example.com",
            email="profile@example.com",
            password="StrongPass123!",
            first_name="Profile",
            last_name="User",
        )
        user.profile.phone = "12345"
        user.profile.address = "Old address"
        user.profile.save()
        self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": user.email, "password": "StrongPass123!"}),
            content_type="application/json",
        )

        response = self.client.patch(
            "/api/profile/",
            data=json.dumps({"phone": "", "address": ""}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["phone"], "")
        self.assertEqual(response.json()["user"]["address"], "")

    def test_request_notes_can_be_cleared(self):
        user = User.objects.create_user(username="owner", password="StrongPass123!")
        request_row = EWasteRequest.objects.create(
            user=user,
            item_type="Laptop",
            quantity=1,
            pickup_address="Stone Town",
            pickup_date=date.today() + timedelta(days=1),
            notes="Call first",
        )
        self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "owner", "password": "StrongPass123!"}),
            content_type="application/json",
        )

        response = self.client.patch(
            f"/api/requests/{request_row.id}/",
            data=json.dumps({"notes": ""}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["notes"], "")

    def test_request_must_be_assigned_before_completion(self):
        owner = User.objects.create_user(username="owner2", password="StrongPass123!")
        request_row = EWasteRequest.objects.create(
            user=owner,
            item_type="Printer",
            pickup_address="Mwanakwerekwe",
            pickup_date=date.today() + timedelta(days=1),
        )
        admin_user = User.objects.create_user(username="admin3", password="StrongPass123!")
        admin_user.profile.role = UserProfile.ROLE_ADMIN
        admin_user.profile.save()
        self.client.post(
            "/api/auth/login/",
            data=json.dumps({"username": "admin3", "password": "StrongPass123!"}),
            content_type="application/json",
        )

        response = self.client.post(
            f"/api/requests/{request_row.id}/status/",
            data=json.dumps({"status": "completed"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Assign a collector", response.json()["error"])
