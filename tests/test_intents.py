from app.core.intents import parse


def test_status():
    assert parse("how is the network").name == "status"


def test_check():
    i = parse("check core-router")
    assert i.name == "check" and i.target == "core-router"


def test_fix():
    i = parse("fix dns-01")
    assert i.name == "remediate" and i.target == "dns-01"


def test_add_device_with_port():
    i = parse("add device web-01 at 10.0.0.5 port 443")
    assert i.name == "add_device"
    assert i.args == {"name": "web-01", "host": "10.0.0.5", "port": "443"}


def test_add_device_ping():
    i = parse("add device printer at 10.0.0.9")
    assert i.name == "add_device" and "port" not in i.args


def test_remove():
    i = parse("remove web-01")
    assert i.name == "remove_device" and i.target == "web-01"


def test_incidents():
    assert parse("any problems?").name == "list_incidents"


def test_history():
    i = parse("history core-router")
    assert i.name == "history" and i.target == "core-router"


def test_design_routes_to_brain():
    assert parse("design an enterprise network").name == "brain_goal"


def test_learning_routes_to_brain():
    assert parse("what have you learned").name == "brain_goal"


def test_help():
    assert parse("help").name == "help"


def test_unknown():
    assert parse("flibberty gibbet").name == "unknown"
