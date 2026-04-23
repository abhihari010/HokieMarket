from __future__ import annotations

from collections.abc import Iterable


class FakeCursor:
    def __init__(
        self,
        *,
        fetchone_values: Iterable[object] | None = None,
        fetchall_values: Iterable[object] | None = None,
        lastrowid: int | None = None,
        execute_error: Exception | None = None,
    ) -> None:
        self.fetchone_values = list(fetchone_values or [])
        self.fetchall_values = list(fetchall_values or [])
        self.lastrowid = lastrowid
        self.execute_error = execute_error
        self.executed: list[tuple[str, object | None]] = []
        self.executemany_calls: list[tuple[str, object]] = []

    def __enter__(self) -> "FakeCursor":
        return self

    def __exit__(self, exc_type, exc, tb) -> bool:
        return False

    def execute(self, query: str, params: object = None) -> None:
        self.executed.append((query, params))
        if self.execute_error is not None:
            raise self.execute_error

    def executemany(self, query: str, seq_params: object) -> None:
        self.executemany_calls.append((query, seq_params))
        if self.execute_error is not None:
            raise self.execute_error

    def fetchone(self) -> object:
        if self.fetchone_values:
            return self.fetchone_values.pop(0)
        return None

    def fetchall(self) -> object:
        if self.fetchall_values:
            return self.fetchall_values.pop(0)
        return []


class FakeConnection:
    def __init__(self, cursors: list[FakeCursor] | None = None) -> None:
        self.cursors = list(cursors or [FakeCursor()])
        self.commit_called = False
        self.rollback_called = False
        self.close_called = False
        self.cursor_calls: list[dict[str, object]] = []

    def cursor(self, dictionary: bool = False) -> FakeCursor:
        self.cursor_calls.append({"dictionary": dictionary})
        if self.cursors:
            return self.cursors.pop(0)
        return FakeCursor()

    def commit(self) -> None:
        self.commit_called = True

    def rollback(self) -> None:
        self.rollback_called = True

    def close(self) -> None:
        self.close_called = True
