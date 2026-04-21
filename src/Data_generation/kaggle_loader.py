"""
Custom Kaggle Data Loader for Digital Wellbeing Project
Loads and preprocesses your specific Kaggle datasets into RL format
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os
from pathlib import Path

class CustomKaggleLoader:
    """
    Load and preprocess the downloaded Kaggle datasets
    """
    
    def __init__(self):
        self.project_root = Path(__file__).resolve().parents[2]
        self.category_mapping = {
            'Social': 'social_media',
            'Entertainment': 'entertainment',
            'Productivity': 'productivity',
            'Utilities': 'productivity',
            'Shopping': 'shopping',
            'News': 'news'
        }

    def _resolve_path(self, filepath):
        """Resolve relative paths from the project root to avoid cwd-dependent failures."""
        path = Path(filepath)
        if path.is_absolute():
            return path
        return self.project_root / path
    
    def load_dataset2(self, filepath='data/raw/kaggle/screen_time_app_usage_dataset.csv'):
        """
        Load the main dataset (screen_time_app_usage_dataset.csv)
        This is the BEST dataset for your project!
        """
        print("="*70)
        print("LOADING DATASET #2: screen_time_app_usage_dataset.csv")
        print("="*70)
        
        dataset_path = self._resolve_path(filepath)
        df = pd.read_csv(dataset_path)
        
        print(f"\n✓ Loaded {len(df):,} rows")
        print(f"✓ Date range: {df['date'].min()} to {df['date'].max()}")
        print(f"✓ Users: {df['user_id'].nunique()}")
        print(f"✓ Apps: {df['app_name'].nunique()}")
        
        # Rename columns to match our standard format
        df_processed = df.rename(columns={
            'app_name': 'app',
            'screen_time_min': 'duration_minutes',
            'date': 'timestamp'
        })
        
        # Convert timestamp to datetime
        df_processed['timestamp'] = pd.to_datetime(df_processed['timestamp'])
        
        # Map categories to our standard format
        df_processed['category'] = df_processed['category'].map(
            self.category_mapping
        ).fillna('other')
        
        # Use the is_productive column to determine time-wasting
        # is_productive = False means it's time-wasting
        df_processed['is_time_wasting'] = (~df_processed['is_productive']).astype(int)
        
        # Keep only essential columns
        essential_cols = [
            'user_id', 'timestamp', 'app', 'category', 
            'duration_minutes', 'launches', 'interactions',
            'is_productive', 'is_time_wasting'
        ]
        
        df_processed = df_processed[essential_cols]
        
        print(f"\n📊 Category Distribution:")
        print(df_processed['category'].value_counts())
        
        print(f"\n📊 Productive vs Time-Wasting:")
        print(f"   Productive: {df_processed['is_productive'].sum():,} ({df_processed['is_productive'].mean()*100:.1f}%)")
        print(f"   Time-Wasting: {df_processed['is_time_wasting'].sum():,} ({df_processed['is_time_wasting'].mean()*100:.1f}%)")
        
        return df_processed
    
    def load_dataset1(self, filepath='data/raw/kaggle/screentime_analysis.csv'):
        """
        Load the smaller dataset (screentime_analysis.csv)
        Useful as supplementary data
        """
        print("\n" + "="*70)
        print("LOADING DATASET #1: screentime_analysis.csv")
        print("="*70)
        
        dataset_path = self._resolve_path(filepath)
        df = pd.read_csv(dataset_path)
        
        print(f"\n✓ Loaded {len(df):,} rows")
        
        # Categorize apps manually (since this dataset has no category column)
        app_categories = {
            'Instagram': 'social_media',
            'WhatsApp': 'social_media',
            'X': 'social_media',
            'Facebook': 'social_media',
            'Safari': 'productivity',
            'Chrome': 'productivity',
            '8 Ball Pool': 'entertainment',
            'YouTube': 'entertainment'
        }
        
        df['category'] = df['App'].map(app_categories).fillna('other')
        
        # Rename columns
        df_processed = df.rename(columns={
            'App': 'app',
            'Date': 'timestamp',
            'Usage (minutes)': 'duration_minutes',
            'Times Opened': 'launches',
            'Notifications': 'interactions'
        })
        
        # Convert timestamp
        df_processed['timestamp'] = pd.to_datetime(df_processed['timestamp'])
        
        # Add user_id (assume all from same user)
        df_processed['user_id'] = 9999  # Different ID to distinguish from dataset2
        
        # Determine time-wasting (social media and entertainment > 15 min)
        df_processed['is_time_wasting'] = (
            (df_processed['category'].isin(['social_media', 'entertainment'])) & 
            (df_processed['duration_minutes'] > 15)
        ).astype(int)
        
        df_processed['is_productive'] = (~df_processed['is_time_wasting'].astype(bool)).astype(int)
        
        # Keep essential columns
        essential_cols = [
            'user_id', 'timestamp', 'app', 'category', 
            'duration_minutes', 'launches', 'interactions',
            'is_productive', 'is_time_wasting'
        ]
        
        df_processed = df_processed[essential_cols]
        
        return df_processed
    
    def add_rl_features(self, df):
        """
        Add features needed for Reinforcement Learning
        """
        print("\n" + "="*70)
        print("ADDING RL FEATURES")
        print("="*70)
        
        # Sort by user and timestamp
        df = df.sort_values(['user_id', 'timestamp'])
        
        # Extract temporal features
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['date'] = df['timestamp'].dt.date
        df['is_weekend'] = (df['day_of_week'] >= 5).astype(int)
        
        # Cumulative time today
        df['cumulative_time_today'] = df.groupby(
            ['user_id', 'date']
        )['duration_minutes'].cumsum()
        
        # Session count today
        df['session_count_today'] = df.groupby(
            ['user_id', 'date']
        ).cumcount() + 1
        
        # Time since last session (in minutes)
        df['time_since_last_session'] = df.groupby(
            'user_id'
        )['timestamp'].diff().dt.total_seconds() / 60
        df['time_since_last_session'] = df['time_since_last_session'].fillna(120)
        
        # Encode categories numerically for RL
        category_encoding = {
            'social_media': 0,
            'entertainment': 1,
            'productivity': 2,
            'shopping': 3,
            'news': 4,
            'other': 5
        }
        df['category_encoded'] = df['category'].map(category_encoding).fillna(5)
        
        print(f"\n✓ Added RL features:")
        print(f"   - hour (0-23)")
        print(f"   - day_of_week (0-6)")
        print(f"   - is_weekend (0/1)")
        print(f"   - cumulative_time_today")
        print(f"   - session_count_today")
        print(f"   - time_since_last_session")
        print(f"   - category_encoded (0-5)")
        
        return df
    
    def combine_datasets(self, df1, df2):
        """
        Combine both datasets
        """
        print("\n" + "="*70)
        print("COMBINING DATASETS")
        print("="*70)
        
        combined = pd.concat([df1, df2], ignore_index=True)
        combined = combined.sort_values(['user_id', 'timestamp'])
        
        print(f"\n✓ Combined {len(df1):,} + {len(df2):,} = {len(combined):,} rows")
        print(f"✓ Total users: {combined['user_id'].nunique()}")
        print(f"✓ Total apps: {combined['app'].nunique()}")
        print(f"✓ Date range: {combined['timestamp'].min()} to {combined['timestamp'].max()}")
        
        return combined
    
    def generate_rl_training_data(self, df):
        """
        Generate state-action-reward tuples for RL training
        """
        print("\n" + "="*70)
        print("GENERATING RL TRAINING DATA")
        print("="*70)
        
        # State features for RL
        state_features = [
            'hour', 
            'day_of_week', 
            'cumulative_time_today', 
            'session_count_today',
            'category_encoded',
            'time_since_last_session',
            'is_weekend'
        ]
        
        states = df[state_features].values
        
        # Generate optimal actions (what should have been done)
        actions = []
        rewards = []
        
        for _, row in df.iterrows():
            if row['is_time_wasting']:
                # Should intervene based on cumulative time
                cum_time = row['cumulative_time_today']
                
                if cum_time < 30:
                    action = 1  # Gentle reminder
                    reward = 5
                elif cum_time < 60:
                    action = 2  # 5s delay
                    reward = 7
                elif cum_time < 90:
                    action = 3  # 10s delay
                    reward = 10
                else:
                    action = 4  # 15s delay (strongest)
                    reward = 15
                
                # Bonus reward if it's late at night (should sleep!)
                if row['hour'] >= 23 or row['hour'] <= 5:
                    reward += 5
                    
            else:
                # Productive app - don't intervene
                action = 0  # No intervention
                reward = 2  # Small reward for good behavior
            
            actions.append(action)
            rewards.append(reward)
        
        df['action'] = actions
        df['reward'] = rewards
        
        print(f"\n✓ Generated {len(states):,} state-action pairs")
        print(f"\n📊 Action Distribution:")
        action_names = {
            0: 'No intervention',
            1: 'Gentle reminder',
            2: '5s delay',
            3: '10s delay',
            4: '15s delay'
        }
        for action, count in df['action'].value_counts().sort_index().items():
            pct = (count / len(df)) * 100
            print(f"   {action} ({action_names[action]}): {count:,} ({pct:.1f}%)")
        
        print(f"\n📊 Reward Statistics:")
        print(f"   Mean reward: {df['reward'].mean():.2f}")
        print(f"   Total reward: {df['reward'].sum():,.0f}")
        
        return states, np.array(actions), np.array(rewards), df
    
    def save_processed_data(self, df, filename='data/processed/kaggle_processed.csv'):
        """
        Save processed data
        """
        print("\n" + "="*70)
        print("SAVING PROCESSED DATA")
        print("="*70)
        
        output_path = self._resolve_path(filename)

        # Create directory if doesn't exist
        os.makedirs(output_path.parent, exist_ok=True)
        
        # Save CSV
        df.to_csv(output_path, index=False)
        print(f"\n✓ CSV saved to: {output_path}")
        
        # Generate and save numpy arrays
        states, actions, rewards, _ = self.generate_rl_training_data(df)
        
        np_filename = output_path.with_suffix('.npz')
        np.savez(
            np_filename,
            states=states,
            actions=actions,
            rewards=rewards
        )
        print(f"✓ NumPy arrays saved to: {np_filename}")
        
        # Print summary
        print(f"\n{'='*70}")
        print("SUMMARY")
        print(f"{'='*70}")
        print(f"Total sessions: {len(df):,}")
        print(f"Time-wasting sessions: {df['is_time_wasting'].sum():,} ({df['is_time_wasting'].mean()*100:.1f}%)")
        print(f"Total screen time: {df['duration_minutes'].sum()/60:.1f} hours")
        print(f"Average session: {df['duration_minutes'].mean():.1f} minutes")
        print(f"\nState shape: {states.shape}")
        print(f"Actions shape: {actions.shape}")
        print(f"Rewards shape: {rewards.shape}")
        print(f"{'='*70}")
        
        return df


def main():
    """
    Main function to load and process all Kaggle data
    """
    print("\n" + "="*70)
    print("KAGGLE DATA PROCESSING PIPELINE")
    print("="*70)
    
    loader = CustomKaggleLoader()
    
    # Load both datasets
    df2 = loader.load_dataset2()  # Main dataset (3000 rows)
    df1 = loader.load_dataset1()  # Smaller dataset (200 rows)
    
    # Combine them
    combined_df = loader.combine_datasets(df1, df2)
    
    # Add RL features
    processed_df = loader.add_rl_features(combined_df)
    
    # Save everything
    final_df = loader.save_processed_data(processed_df)
    
    print("\n" + "="*70)
    print("✓ ALL DONE!")
    print("="*70)
    print("\nNext steps:")
    print("1. Load 'data/processed/kaggle_processed.npz' in PyTorch")
    print("2. Train your RL model (Q-Learning or DQN)")
    print("3. Combine with synthetic data for even more training data!")
    print("="*70)
    
    return final_df


def load_and_process_kaggle(output_csv: str = 'data/processed/kaggle_processed.csv'):
    """Public entrypoint used by package imports and downstream scripts."""
    loader = CustomKaggleLoader()
    df2 = loader.load_dataset2()
    df1 = loader.load_dataset1()
    combined_df = loader.combine_datasets(df1, df2)
    processed_df = loader.add_rl_features(combined_df)
    return loader.save_processed_data(processed_df, filename=output_csv)


if __name__ == "__main__":
    df = main()