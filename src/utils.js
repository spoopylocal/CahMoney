function formatCoins(amount) {
  return `${amount.toLocaleString()} coin${amount === 1 ? "" : "s"}`;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampBet(rawAmount, wallet) {
  const amount = Math.floor(rawAmount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Bet amount must be a positive number." };
  }

  if (amount > wallet) {
    return { ok: false, message: `You only have ${formatCoins(wallet)} in your wallet.` };
  }

  return { ok: true, amount };
}

function getCooldown(lastUsed, cooldownMs) {
  const remaining = cooldownMs - (Date.now() - lastUsed);

  if (remaining <= 0) {
    return null;
  }

  const seconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(seconds / 60);
  const leftoverSeconds = seconds % 60;

  if (minutes <= 0) return `${seconds}s`;
  if (leftoverSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${leftoverSeconds}s`;
}

module.exports = {
  formatCoins,
  randomInt,
  clampBet,
  getCooldown
};
