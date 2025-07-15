#!/bin/bash

echo "Testing thread creation..."

# Test with correct format (no userId in body)
echo "Making request without userId in body..."
curl -X POST https://dev-experience.rpotential.dev/api/v1/threads \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json' \
  -H 'Cookie: rpotential_auth=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMDA2NzA0Mjk3MDUxNzYwMDc4ODUiLCJlbWFpbCI6ImNhcmxvc0BycG90ZW50aWFsLmFpIiwibmFtZSI6IkNhcmxvcyBHdWVycmVybyIsImRvbWFpbiI6InJwb3RlbnRpYWwuYWkiLCJpYXQiOjE3NTI2MDg4MDcsImV4cCI6MTc1MjY5NTIwNywiaXNzIjoiYXV0aC5ycG90ZW50aWFsLmRldiJ9.pNLzdKwbbDkvqUR8EVgLrGEwKD5DdZ0ZIYoWD9Uju-g' \
  -d '{
    "title": "Discussion about AI ethics",
    "description": "A detailed discussion about the ethical implications of AI",
    "metadata": {
      "tags": ["ai", "ethics"],
      "priority": "high"
    }
  }' \
  -w "\nStatus Code: %{http_code}\n" \
  -s

echo -e "\n\nRequest completed."
