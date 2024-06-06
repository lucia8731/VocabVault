import requests
import pandas as pd 
import re
from googleapiclient.discovery import build
from google.oauth2 import service_account

def get_data_from_sheets(sheet_id, range_name):
    SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
    SERVICE_ACCOUNT_FILE = 'path/to/credentials.json'

    creds = None
    creds = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, scopes=SCOPES)
    
    service = build('sheets', 'v4', credentials=creds)
    sheet = service.spreadsheets()

    result = sheet.values().get(spreadsheetId=sheet_id,
                                range=range_name).execute()
    values = result.get('values', [])
    return values

def import_to_anki(data):
    notes = []
    for row in data:
        word, definition, example = row
        note = {
            "deckName": "Default",
            "modeName": "Basic",
            "fields": {
                "Front": word,
                "Back": f"{definition}\n\nExample: {example}"
            },
            "tags": []
        }
        notes.append(note)
    
    request_body = {
        "action": "addNotes",
        "version": 6,
        "params": {
            "notes": notes
        }
    }

    response = requests.post('http://localhost:8765', json=request_body)
    print(response.json())

if __name__ == "__main__":
    sheet_url = input("Enter the sheet URL:")
    sheet_id = re.search(r'/spreadsheets/d/([a-zA-Z0-9-_]+)', sheet_url).group(1)
    range_name = "Sheet1!A1:C"
    data = get_data_from_sheets(sheet_id, range_name)
    import_to_anki(data)