# load_kaggle_data.py (place in ROOT folder)
import sys
sys.path.append('src')

from Data_generation.kaggle_loader import CustomKaggleLoader

if __name__ == "__main__":
    print("="*70)
    print("LOADING KAGGLE DATA")
    print("="*70)
    
    loader = CustomKaggleLoader()
    
    # Load both datasets
    df2 = loader.load_dataset2()
    df1 = loader.load_dataset1()
    
    # Combine them
    combined = loader.combine_datasets(df1, df2)
    
    # Add RL features
    processed = loader.add_rl_features(combined)
    
    # Save
    final_df = loader.save_processed_data(processed)
    
    print("\n✓ Done! Data saved to data/processed/kaggle_processed.csv")