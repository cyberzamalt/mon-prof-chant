# 🔒 ARCHIVE - Mon Professeur de Chant

## 📦 Qu'est-ce que ce dossier ?

Ce dossier contient **les sauvegardes de tous les fichiers fonctionnels** avant la migration vers l'architecture modulaire.

**Date d'archivage :** 29 Octobre 2025

---

## 🎯 Pourquoi cette archive ?

Nous migrons d'une **architecture monolithique** (tout dans 1 fichier) vers une **architecture modulaire professionnelle** (95 fichiers organisés).

**Problème :** La migration peut casser des choses.

**Solution :** Garder une copie 100% fonctionnelle de l'ancienne version.

---

## 📁 Structure de l'archive

```
archive/
├── README.md (ce fichier)
├── ARCHIVE_DATE.txt (date de sauvegarde)
│
├── monolith/
│   ├── index.html.backup ⭐ LE FICHIER PRINCIPAL QUI MARCHE
│   └── app.js.backup (alternative)
│
├── tests/
│   └── test-audio-core.html.backup (version test modulaire)
│
└── modules/
    └── src-backup/ (copie de tous les modules existants)
```

---

## ✅ Fichiers sauvegardés

### 1. index.html.backup (562 lignes)
**Le fichier monolithe principal qui marche parfaitement**

**Contient :**
- Détection pitch YIN fonctionnelle
- Lissage multi-stage opérationnel
- Visualisation sinusoïdale fluide (3 modes)
- Enregistrement audio avec micro
- Exports WebM, WAV, MP3

**Points critiques préservés :**
- `DETECT_SIZE = 2048`
- `MIN_HZ = 60, MAX_HZ = 1200`
- Mode A440 par défaut (corrigé)
- Smoothing factor = 0.76
- YIN threshold = 0.05

### 2. app.js.backup (277 lignes)
**Version alternative du monolithe**

Même fonctionnalités que index.html mais en IIFE (Immediately Invoked Function Expression).

### 3. test-audio-core.html.backup (77 lignes)
**Version test modulaire légère**

Charge des modules externes. Bon exemple d'approche modulaire mais version incomplète.

### 4. src-backup/
**Copie de tous les modules créés**

33 modules existants au moment de l'archivage.

---

## 🚨 RÈGLES IMPORTANTES

### ⛔ NE JAMAIS modifier les fichiers dans archive/

Ces fichiers sont des **snapshots** (instantanés). Ils ne doivent JAMAIS être modifiés.

**Si quelque chose casse :**
1. Copier le fichier `.backup` vers la racine
2. Renommer (enlever `.backup`)
3. Tester que ça marche
4. Continuer le travail

**Exemple :**
```bash
# Si la nouvelle version casse
cp archive/monolith/index.html.backup index.html
# → Ça remarche instantanément !
```

---

## 🔄 Utilisation de l'archive

### Scénario 1 : Tester l'ancien code

Tu veux vérifier que l'ancienne version marche toujours ?

1. Ouvre `archive/monolith/index.html.backup` dans ton navigateur
2. Ça doit fonctionner parfaitement (sinusoïdales, enregistrement, etc.)

### Scénario 2 : Rollback d'urgence

La nouvelle architecture ne marche pas et tu veux revenir en arrière ?

1. Va sur GitHub
2. Copie le contenu de `archive/monolith/index.html.backup`
3. Colle-le dans `index.html` (écrase le nouveau)
4. Commit
5. → Tout remarche

### Scénario 3 : Comparer ancien vs nouveau

Tu veux comparer les performances ?

1. Ouvre les deux versions côte à côte
2. Teste la même chose sur chacune
3. Compare les résultats

---

## 📊 Métriques de référence (Monolithe)

Ces métriques sont celles de la version archivée. La nouvelle version doit être **au moins aussi bonne**.

| Métrique | Valeur Monolithe | Cible Modulaire |
|----------|------------------|-----------------|
| **Détection pitch** | 221 brutes, 217 lissées | ≥ 200 lissées |
| **FPS rendu** | ~60 FPS | ≥ 60 FPS |
| **Latence** | <50ms | <50ms |
| **Précision** | ±10 cents | ±10 cents |
| **Mémoire** | ~80 MB | <100 MB |

---

## 🎓 Leçons apprises (Monolithe)

### ✅ Ce qui a bien marché

- Algorithme YIN robuste
- Lissage multi-stage efficace
- Interpolation Catmull-Rom fluide
- Mode A440 par défaut (bon choix)

### ❌ Ce qui a mal tourné

- Architecture monolithique → effet domino des bugs
- Corrections successives → régressions
- Tests impossibles → debugging difficile
- État global → couplage fort

### 💡 Pour la suite (Architecture modulaire)

- ✅ Extraire modules isolés
- ✅ Tester chaque module
- ✅ Garder API stable
- ✅ Éviter couplage fort

---

## 🔗 Liens utiles

- **GitHub :** https://github.com/cyberzamalt/mon-prof-chant
- **GitHub Pages :** https://cyberzamalt.github.io/mon-prof-chant/
- **Documentation :** Voir les PDFs dans `/docs`

---

## 📅 Historique des versions

### Version Monolithe (27 Oct 2025) ⭐ ARCHIVÉE

**Bugs résolus :**
1. Mode Auto recentre (courbe plate) → Mode A440 par défaut
2. Bug CSS `color:#var` → `color:var`
3. YIN maxLag hors limites → Corrections
4. `smoother.process` → `smoother.smooth`
5. Validation coords Y manquante → Ajoutée
6. DETECT_SIZE 512 → 2048
7. Import paths ES6 incorrects → Corrigés

**Dernière version stable :** 27 Oct 2025 15h30

---

## 🤝 Contribution

Si tu découvres un bug dans l'archive (ce qui serait surprenant car ce sont des snapshots), **NE MODIFIE PAS** les fichiers archivés.

À la place :
1. Note le bug
2. Corrige-le dans la nouvelle version modulaire
3. Documente-le dans le CHANGELOG

---

## 📝 Notes

Cette archive est une **assurance** contre les régressions. Elle reste tant que la nouvelle architecture n'est pas validée à 100%.

Une fois la migration terminée et validée :
- On peut garder cette archive pour l'historique
- Ou la supprimer si la nouvelle version est clairement supérieure

**Pour l'instant : ON GARDE ! 🔒**

---

**FIN DU README ARCHIVE**
