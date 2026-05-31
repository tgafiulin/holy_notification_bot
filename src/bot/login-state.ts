export type LoginStep = "idle" | "awaiting_username" | "awaiting_password";

export type LoginState = {
  step: LoginStep;
  username?: string;
};

let state: LoginState = { step: "idle" };

export function getLoginState(): LoginState {
  return state;
}

export function setLoginState(next: LoginState): void {
  state = next;
}

export function resetLoginState(): void {
  state = { step: "idle" };
}

export function startLoginPrompt(): void {
  state = { step: "awaiting_username" };
}
