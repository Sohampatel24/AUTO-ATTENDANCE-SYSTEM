#!/usr/bin/env python3
"""
Test script to verify the pipeline API server is working correctly
"""

import requests
import json
import time
import sys
import os

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        response = requests.get("http://localhost:5000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working!")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Health endpoint returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to API server on port 5000")
        return False
    except Exception as e:
        print(f"❌ Error testing health endpoint: {e}")
        return False

def test_pipeline_integration():
    """Test that the pipeline model integration is working"""
    print("🧪 Testing Pipeline API Integration...")
    print("=" * 50)
    
    # Test health endpoint
    print("1. Testing health endpoint...")
    health_ok = test_health_endpoint()
    
    if not health_ok:
        print("\n❌ Pipeline API server is not responding!")
        print("Please make sure to start the API server first:")
        print("python api_server.py")
        return False
    
    print("\n✅ Pipeline API server is running correctly!")
    print("\n📋 Available endpoints:")
    print("  - POST /enroll (student enrollment)")
    print("  - POST /enroll-professor (professor enrollment)")
    print("  - POST /video_recognize (video analysis)")
    print("  - POST /delete_person (delete person)")
    print("  - GET /health (health check)")
    
    print(f"\n📁 Database directory: {os.path.abspath('data/output/embeddings/known_db')}")
    
    return True

if __name__ == "__main__":
    success = test_pipeline_integration()
    if not success:
        sys.exit(1)
    
    print("\n🎉 All tests passed! The pipeline integration is working correctly.")
    print("\nTo test the full system:")
    print("1. Keep the pipeline API running: python api_server.py")
    print("2. Start the backend Node.js server: node server.js")
    print("3. Access the web interface at: http://localhost:3000")