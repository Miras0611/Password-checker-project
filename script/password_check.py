from browser import document, window


COMMON = ["123456", "password", "qwerty", "admin", "12345678", "111111",
          "abc123", "iloveyou", "qwerty123", "123123", "letmein", "welcome",
          "monkey", "dragon", "parol", "1q2w3e", "zaq12wsx", "kazakhstan"]

ROWS = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop",
        "asdfghjkl", "zxcvbnm", "йцукенгшщзх", "фывапролдж"]


def has_repeat(pw):
    for i in range(len(pw) - 2):
        if pw[i] == pw[i + 1] == pw[i + 2]:
            return True
    return False


def has_sequence(pw):
    low = pw.lower()
    for row in ROWS:
        for i in range(len(row) - 2):
            part = row[i:i + 3]
            if part in low or part[::-1] in low:
                return True
    return False


def check_password(pw):
    if pw == "":
        return 0, []

    score = 0
    tips = []
    n = len(pw)
    low_pw = pw.lower()

    # длина
    if n >= 8:
        score += 1
    if n >= 11:
        score += 1
    if n >= 14:
        score += 1
    if n < 14:
        tips.append("длина " + str(n) + " из 14")

    # какие типы символов есть
    low = up = dig = sym = False
    for ch in pw:
        if ch.islower():
            low = True
        elif ch.isupper():
            up = True
        elif ch.isdigit():
            dig = True
        else:
            sym = True

    if low:
        score += 1
    else:
        tips.append("добавь строчные буквы")
    if up:
        score += 1
    else:
        tips.append("добавь заглавные буквы")
    if dig:
        score += 1
    else:
        tips.append("добавь цифры")
    if sym:
        score += 1
    else:
        tips.append("добавь символ (!?#$ и т.д.)")

    if low_pw in COMMON:
        tips.append("слишком популярный пароль")
        return 1, tips

    for w in COMMON:
        if len(w) >= 5 and w in low_pw:
            score -= 2
            tips.append("внутри популярное слово")
            break

    if has_repeat(pw):
        score -= 1
        tips.append("3 одинаковых символа подряд")

    if has_sequence(pw):
        score -= 1
        tips.append("простая последовательность (abc, 123, qwe)")

    if len(set(pw)) < n // 2:
        score -= 1
        tips.append("слишком много повторов")

    if score <= 2:
        level = 1
    elif score <= 4:
        level = 2
    elif score <= 6:
        level = 3
    else:
        level = 4

    return level, tips


LABELS = {0: "введите пароль", 1: "уровень 1: слабый", 2: "уровень 2: средний",
          3: "уровень 3: сильный", 4: "уровень 4: очень сильный"}


def on_input(ev):
    pw = document["reg-pass"].value
    level, tips = check_password(pw)

    for i in range(1, 5):
        seg = document["seg" + str(i)]
        if i <= level:
            seg.className = "seg on l" + str(level)
        else:
            seg.className = "seg"

    document["level-label"].text = LABELS[level]
    if level == 4:
        document["tips"].text = "пароль принимается"
    else:
        document["tips"].text = ", ".join(tips)

    document["reg-btn"].disabled = (level < 4)


document["reg-pass"].bind("input", on_input)

window.pwLevel = lambda pw: check_password(pw)[0]

chip = document["py-chip"]
chip.text = "python: работает"
chip.className = "chip ok"
window.pwReady = True
