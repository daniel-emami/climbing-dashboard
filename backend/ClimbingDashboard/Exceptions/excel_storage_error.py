from ClimbingDashboard.Exceptions.storage_error import StorageError


class ExcelStorageError(StorageError):
    """Raised when the workbook cannot be read from or written to."""
