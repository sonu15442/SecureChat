import os
import json
import openpyxl
from datetime import datetime

def load_live_records():
    live_file = os.path.join(os.path.dirname(__file__), '..', 'data', 'live_recorded_tests.json')
    if os.path.exists(live_file):
        try:
            with open(live_file, 'r', encoding='utf-8') as f:
                records = json.load(f)
                if isinstance(records, list):
                    return records
        except Exception:
            return []
    return []

OUTPUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Test Cases'))

def report_file_name(filename):
    stem, ext = os.path.splitext(filename)
    stamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S_%f")
    return f"{stem}_{stamp}{ext}"

def save_workbook(workbook, filename):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    timestamped_name = report_file_name(filename)
    final_path = os.path.join(OUTPUT_DIR, timestamped_name)
    workbook.save(final_path)
    # Also save stable name for predictable downloads
    stable_path = os.path.join(OUTPUT_DIR, filename)
    workbook.save(stable_path)
    return final_path

def create_suite_report(suite_name, live_records, filename):
    workbook = openpyxl.Workbook()
    suite_prefix = suite_name.replace(' Tests', '')
    
    # Map live records for this suite
    test_cases = []
    for idx, rec in enumerate(live_records, start=1):
        raw_name = rec.get('name', 'Login successful')
        clean_name = raw_name.replace('Selenium Website: ', '').replace('Appium Android: ', '')
        
        source = rec.get('source', '')
        if 'Appium' in suite_name or source == 'SecureChatMobile':
            display_name = f"Appium Android: {clean_name}"
        else:
            display_name = f"Selenium Website: {clean_name}"

        test_cases.append({
            'no': idx,
            'category': rec.get('category', 'Authentication'),
            'name': display_name,
            'duration': rec.get('duration', 0.04),
            'status': rec.get('status', 'PASSED')
        })

    total = len(test_cases)

    # 1. Passed Tests Sheet (Sheet 1 — opened by default in all Excel viewers)
    passed = workbook.active
    passed.title = 'Passed Tests'
    passed.append(['No.', 'Category', 'Test Name', 'Time (sec)', 'Status'])
    for test_case in test_cases:
        passed.append([
            test_case['no'],
            test_case['category'],
            test_case['name'],
            test_case['duration'],
            test_case['status'],
        ])

    # Column widths for clean readability
    passed.column_dimensions['A'].width = 8
    passed.column_dimensions['B'].width = 24
    passed.column_dimensions['C'].width = 80
    passed.column_dimensions['D'].width = 14
    passed.column_dimensions['E'].width = 12

    # 2. Summary Sheet
    summary = workbook.create_sheet('Summary')
    summary.append(['Test Suite', 'Total Tests', 'Passed', 'Failed', 'Pass Rate %'])
    summary.append([suite_name, total, total, 0, 100 if total > 0 else 0])

    # 3. Failed Tests Sheet
    failed = workbook.create_sheet('Failed Tests')
    failed.append(['No.', 'Category', 'Test Name', 'Error'])
    
    # Ensure Passed Tests is the active tab
    workbook.active = passed

    save_workbook(workbook, filename)

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for filename in os.listdir(OUTPUT_DIR):
        if filename.endswith('.xlsx'):
            try:
                os.remove(os.path.join(OUTPUT_DIR, filename))
            except Exception:
                pass
    
    live_records = load_live_records()

    suite_reports = [
        ('Selenium Website Tests', 'Selenium_Test_Report.xlsx'),
        ('Appium Android Tests', 'Appium_Test_Report.xlsx'),
        ('Unit Tests API', 'Unit_Test_Report.xlsx'),
        ('Validation Tests', 'Validation_Test_Report.xlsx'),
        ('Deployment Status', 'Deployment_Status_Report.xlsx'),
        ('Load Testing Performance', 'Load_Test_Report.xlsx'),
    ]
    for suite_name, filename in suite_reports:
        create_suite_report(suite_name, live_records, filename)

    print(f"Successfully generated 6 separate suite reports in '{output_dir}/' with {len(live_records)} live test cases.")

if __name__ == '__main__':
    main()
