"""CLI entrypoint for loading and preprocessing Kaggle datasets."""

try:
    from Data_generation.kaggle_loader import CustomKaggleLoader
except ImportError:
    from src.Data_generation.kaggle_loader import CustomKaggleLoader


def main():
    print("=" * 70)
    print("LOADING KAGGLE DATA")
    print("=" * 70)

    loader = CustomKaggleLoader()

    # Load both datasets.
    df2 = loader.load_dataset2()
    df1 = loader.load_dataset1()

    # Combine and enrich with RL features.
    combined = loader.combine_datasets(df1, df2)
    processed = loader.add_rl_features(combined)
    loader.save_processed_data(processed)

    print("\nDone! Data saved to data/processed/kaggle_processed.csv")


if __name__ == "__main__":
    main()
