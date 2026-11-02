import os, sys, tempfile
tmp = tempfile.mkdtemp(prefix="myelin_desk_")
os.environ["APPDATA"] = tmp
os.environ["LOCALAPPDATA"] = tmp
os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
sys.dont_write_bytecode = True
ROOT = r"C:\Users\Dharshan\Downloads\MYELIN_GENALOGY\MYELIN2.0_ULTIMATE_TRIAL"
sys.path.insert(0, ROOT)
OUT = sys.argv[1]
theme = sys.argv[2] if len(sys.argv) > 2 else "neon"
from PyQt6.QtWidgets import QApplication, QScrollArea, QFrame, QLabel, QPushButton, QWidget, QTableWidget, QComboBox
from PyQt6.QtCore import QTimer
from CONTROL_STATION import launcher
from PERSISTENCE.storage import bootstrap_production_schema
bootstrap_production_schema()
app = QApplication(sys.argv)
launcher._configure_application(app)
from CONTROL_STATION import application as A
w = A.ControlStationWindow()
w.resize(1460, 960); w.move(20, 20); w.show()


def dump(name, root):
    lines = []
    for wd in root.findChildren(QWidget):
        if not wd.isVisibleTo(root):
            continue
        if isinstance(wd, QLabel):
            lines.append("L|%s|%r" % (wd.objectName(), wd.text()))
        elif isinstance(wd, QPushButton):
            lines.append("B|%s|%r|checkable=%s" % (wd.objectName(), wd.text(), wd.isCheckable()))
        elif isinstance(wd, QTableWidget):
            hs = [wd.horizontalHeaderItem(i).text() if wd.horizontalHeaderItem(i) else "" for i in range(wd.columnCount())]
            rows = [[(wd.item(r, c).text() if wd.item(r, c) else "") for c in range(wd.columnCount())] for r in range(wd.rowCount())]
            lines.append("T|%s|%r|%r" % (wd.objectName(), hs, rows))
        elif isinstance(wd, QComboBox):
            lines.append("C|%s|%r" % (wd.objectName(), [wd.itemText(i) for i in range(wd.count())]))
        elif type(wd).__name__ not in ("QWidget", "QFrame"):
            lines.append("W|%s|%s" % (type(wd).__name__, wd.objectName()))
    open(os.path.join(OUT, name + "_dump.txt"), "w", encoding="utf-8").write(chr(10).join(lines))


def go():
    w.theme.set_base_theme(theme)
    w.navigation.open_page(A.PAGE_SECANT_DASHBOARD)
    QTimer.singleShot(3500, shot)


def shot():
    try:
        _shot()
    except BaseException:
        import traceback
        open(os.path.join(OUT, 'desk_secant_err.txt'), 'w').write(traceback.format_exc())
        os._exit(3)


def _shot():
    from SECANT.dashboard_view import SecantCosecantDashboard
    page = w.findChildren(SecantCosecantDashboard)[0]
    land = page.landing
    sc = land.findChild(QScrollArea, "secantLandingScroll")
    sc.widget().grab().save(os.path.join(OUT, "desktop_secant_landing_full.png"))
    dump("desktop_secant_landing", land)
    page.open_analysis()
    routes = list(page.analysis.ROUTES) + list(page.analysis.HISTORY_ROUTES)
    state = {"i": 0}

    def step():
        i = state["i"]
        if i >= len(routes):
            print("done"); sys.stdout.flush(); os._exit(0)
        try:
            page.analysis.select_route(routes[i])
        except BaseException as exc:
            print("ERR", routes[i], exc); sys.stdout.flush()
        QTimer.singleShot(1500, lambda: grab(routes[i]))

    def grab(r):
        w.grab().save(os.path.join(OUT, "desktop_secant_dlg_%s.png" % r))
        pg = page.analysis._pages[r]
        pg.grab().save(os.path.join(OUT, "desktop_secant_dlgfull_%s.png" % r))
        dump("desktop_secant_dlg_%s" % r, page.analysis)
        print(r, pg.width(), pg.height()); sys.stdout.flush()
        state["i"] += 1
        step()
    QTimer.singleShot(2500, step)


QTimer.singleShot(2500, go)
app.exec()
