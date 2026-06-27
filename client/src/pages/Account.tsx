import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../AuthContext";
import { isValidEmail, passwordStrengthError } from "../validation";

export default function Account() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [emailForm, setEmailForm] = useState({ email: user?.email ?? "" });
  const [emailMsg, setEmailMsg] = useState("");
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [passwordMsg, setPasswordMsg] = useState("");

  const pwError = passwordForm.newPassword ? passwordStrengthError(passwordForm.newPassword) : null;

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailMsg("");
    if (!isValidEmail(emailForm.email)) {
      setEmailMsg("Enter a valid email address.");
      return;
    }
    try {
      await api.put("/auth/email", { email: emailForm.email });
      await refreshUser();
      setEmailMsg("Email updated.");
    } catch (err: any) {
      setEmailMsg(err?.response?.data?.error ?? "Could not update email.");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg("");
    const strengthError = passwordStrengthError(passwordForm.newPassword);
    if (strengthError) {
      setPasswordMsg(strengthError);
      return;
    }
    try {
      await api.put("/auth/password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setPasswordMsg("Password updated.");
    } catch (err: any) {
      setPasswordMsg(err?.response?.data?.error ?? "Could not update password.");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  if (!user) return null;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Account</h2>
        <p className="text-sm">{user.name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Change email</h2>
        <form onSubmit={changeEmail} className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
            type="email"
            value={emailForm.email}
            onChange={(e) => setEmailForm({ email: e.target.value })}
            required
          />
          {emailMsg && <p className="text-xs text-gray-500 dark:text-gray-400">{emailMsg}</p>}
          <button type="submit" className="w-full rounded bg-gray-800 dark:bg-gray-600 py-1.5 text-sm font-medium text-white">
            Update email
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Change password</h2>
        <form onSubmit={changePassword} className="space-y-2">
          <input
            className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
            type="password"
            placeholder="Current password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            required
          />
          <input
            className="w-full rounded border border-gray-300 dark:border-gray-600 px-2 py-1 text-sm"
            type="password"
            placeholder="New password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            minLength={8}
            required
          />
          <p className="text-xs text-gray-400 dark:text-gray-500">8+ characters, with an uppercase letter, a lowercase letter, and a number.</p>
          {pwError && <p className="text-xs text-amber-600 dark:text-amber-400">{pwError}</p>}
          {passwordMsg && <p className="text-xs text-gray-500 dark:text-gray-400">{passwordMsg}</p>}
          <button type="submit" className="w-full rounded bg-gray-800 dark:bg-gray-600 py-1.5 text-sm font-medium text-white">
            Update password
          </button>
        </form>
      </section>

      <button onClick={handleLogout} className="w-full rounded bg-red-600 py-2 text-sm font-medium text-white">
        Log out
      </button>
    </div>
  );
}
