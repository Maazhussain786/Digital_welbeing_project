"""Agent abstraction that can use Q-learning or DQN backends."""


class WellbeingAgent:
    def __init__(self, model):
        self.model = model

    def act(self, state):
        if hasattr(self.model, "choose_action"):
            return self.model.choose_action(state)
        if hasattr(self.model, "predict_action"):
            return self.model.predict_action(state)
        raise AttributeError("Model does not expose an action API.")
