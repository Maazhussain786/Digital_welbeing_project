"""
Quick script to inspect downloaded Kaggle datasets
Run: python inspect_kaggle_data.py
"""

import pandas as pd
import os
import glob

def inspect_kaggle_data():
    print("="*70)
    print("KAGGLE DATA INSPECTION")
    print("="*70)
    
    # Find all CSV files
    csv_files = glob.glob('data/raw/kaggle/**/*.csv', recursive=True)
    
    if not csv_files:
        print("\n❌ No CSV files found in data/raw/kaggle/")
        print("\nMake sure you've extracted the zip files!")
        return
    
    print(f"\n✓ Found {len(csv_files)} CSV file(s):\n")
    
    for idx, filepath in enumerate(csv_files, 1):
        print(f"\n{'='*70}")
        print(f"FILE #{idx}: {os.path.basename(filepath)}")
        print(f"Path: {filepath}")
        print(f"{'='*70}")
        
        try:
            # Read the CSV
            df = pd.read_csv(filepath)
            
            # Basic info
            file_size = os.path.getsize(filepath) / 1024  # KB
            print(f"\n📊 Basic Info:")
            print(f"   Size: {file_size:.1f} KB")
            print(f"   Rows: {len(df):,}")
            print(f"   Columns: {len(df.columns)}")
            
            # Column names and types
            print(f"\n📋 Columns ({len(df.columns)}):")
            for i, (col, dtype) in enumerate(df.dtypes.items(), 1):
                non_null = df[col].notna().sum()
                print(f"   {i:2d}. {col:30s} | {str(dtype):10s} | {non_null:,} non-null")
            
            # Sample data
            print(f"\n🔍 First 3 Rows:")
            print(df.head(3).to_string(index=False))
            
            # Check for important columns
            print(f"\n✅ Key Columns Found:")
            important_cols = {
                'app': ['app', 'app_name', 'application', 'app_usage'],
                'time': ['time', 'duration', 'screen_time', 'usage_time', 'minutes'],
                'category': ['category', 'type', 'app_category'],
                'date': ['date', 'timestamp', 'day'],
                'user': ['user', 'user_id', 'id']
            }
            
            for key, variants in important_cols.items():
                found = [col for col in df.columns if any(v in col.lower() for v in variants)]
                if found:
                    print(f"   • {key.upper()}: {', '.join(found)}")
            
            # Basic statistics
            print(f"\n📈 Numeric Columns Summary:")
            numeric_cols = df.select_dtypes(include=['int64', 'float64']).columns
            if len(numeric_cols) > 0:
                print(df[numeric_cols].describe().to_string())
            else:
                print("   No numeric columns found")
            
            # Check for missing values
            print(f"\n⚠️  Missing Values:")
            missing = df.isnull().sum()
            missing = missing[missing > 0]
            if len(missing) > 0:
                for col, count in missing.items():
                    pct = (count / len(df)) * 100
                    print(f"   • {col}: {count:,} ({pct:.1f}%)")
            else:
                print("   ✓ No missing values!")
            
            # Unique values in categorical columns
            print(f"\n🏷️  Categorical Columns (first 5 values):")
            cat_cols = df.select_dtypes(include=['object']).columns[:5]
            for col in cat_cols:
                unique_count = df[col].nunique()
                sample_values = df[col].value_counts().head(5)
                print(f"\n   {col} ({unique_count} unique):")
                for val, count in sample_values.items():
                    print(f"      - {val}: {count:,}")
            
        except Exception as e:
            print(f"\n❌ Error reading file: {e}")
    
    print(f"\n{'='*70}")
    print("INSPECTION COMPLETE!")
    print("="*70)
    print("\nNext Steps:")
    print("1. Identify which columns map to: app_name, duration, category, timestamp")
    print("2. Run the preprocessing script to convert to RL format")
    print("3. Combine with synthetic data for training")
    print("="*70)


if __name__ == "__main__":
    inspect_kaggle_data()