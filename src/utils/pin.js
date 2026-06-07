// Gestion du code PIN.
// Le PIN n'est JAMAIS stocké en clair : on stocke seulement son "hash" bcrypt,
// une empreinte à sens unique. Pour vérifier un PIN saisi, on compare au hash.
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

// Règle de validation : 4 à 6 chiffres.
export function isValidPin(pin) {
  return /^\d{4,6}$/.test(pin ?? "");
}

// Transforme un PIN en empreinte à stocker dans Firestore.
export function hashPin(pin) {
  return bcrypt.hashSync(pin, SALT_ROUNDS);
}

// Vérifie qu'un PIN saisi correspond à une empreinte stockée.
export function verifyPin(pin, pinHash) {
  if (!pin || !pinHash) return false;
  return bcrypt.compareSync(pin, pinHash);
}
