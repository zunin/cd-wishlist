import type { FC } from "react";
import { useMemo } from "react";
import { useAppSelector, useAppDispatch } from "../reduxhooks.ts";
import {
    updateColumnMapping,
    updateHasHeaderRow,
    updateDelimiter,
    applyColumnMappingAndContinue,
    clearCurrentImport,
} from "../store/importQueue.ts";
import {
    applyColumnMapping,
    validateColumnMapping,
    AVAILABLE_DELIMITERS,
    type ColumnMapping,
} from "../utils/csvParser.ts";

interface ImportColumnMapperProps {
    onBack: () => void;
}

export const ImportColumnMapper: FC<ImportColumnMapperProps> = ({ onBack }) => {
    const dispatch = useAppDispatch();
    const { rawData, columnMapping } = useAppSelector(
        (state) => state.importQueue.currentImport,
    );

    // Validate the current mapping
    const validation = useMemo(() => {
        if (!columnMapping)
            return { valid: false, error: "No mapping configured" };
        return validateColumnMapping(columnMapping);
    }, [columnMapping]);

    // Get header row if exists
    const headerRow = useMemo(() => {
        if (!columnMapping?.hasHeaderRow || !rawData?.rows.length) return null;
        return rawData.rows[0];
    }, [columnMapping?.hasHeaderRow, rawData]);

    // Get data rows (skip header if needed)
    const dataRows = useMemo(() => {
        if (!rawData?.rows) return [];
        const startIndex = columnMapping?.hasHeaderRow ? 1 : 0;
        return rawData.rows.slice(startIndex, 6); // Show up to 5 data rows
    }, [rawData, columnMapping?.hasHeaderRow]);

    const handleMappingChange = (columnIndex: number, value: string) => {
        dispatch(
            updateColumnMapping({
                columnIndex,
                mapping: value as ColumnMapping,
            }),
        );
    };

    const handleContinue = () => {
        if (!rawData || !columnMapping) return;

        const albums = applyColumnMapping(rawData, columnMapping);

        if (albums.length === 0) {
            alert("No valid albums found. Please check your column mapping.");
            return;
        }

        dispatch(applyColumnMappingAndContinue(albums));
    };

    const handleCancel = () => {
        dispatch(clearCurrentImport());
        onBack();
    };

    const getMappingCount = (type: ColumnMapping): number => {
        if (!columnMapping) return 0;
        return columnMapping.mappings.filter((m: ColumnMapping) => m === type)
            .length;
    };

    if (!rawData || !columnMapping) {
        return (
            <div className="import-column-mapper">
                <h3>Error</h3>
                <p>No CSV data loaded. Please go back and try again.</p>
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleCancel}
                >
                    Back
                </button>
            </div>
        );
    }

    const columnCount = rawData.rows[0]?.length || 0;

    return (
        <div className="import-column-mapper">
            <h3>Map CSV Columns</h3>

            <div className="column-mapping-config cluster">
                <div className="mapping-option">
                    <label>
                        <input
                            type="checkbox"
                            checked={columnMapping.hasHeaderRow}
                            onChange={(e) =>
                                dispatch(updateHasHeaderRow(e.target.checked))
                            }
                        />
                        First row is header
                    </label>
                    <span className="mapping-hint">
                        Check this if the first row contains column titles
                    </span>
                </div>

                <div className="mapping-option">
                    <label htmlFor="delimiter-select">Delimiter:</label>
                    <select
                        id="delimiter-select"
                        value={columnMapping.delimiter}
                        onChange={(e) =>
                            dispatch(updateDelimiter(e.target.value))
                        }
                    >
                        {AVAILABLE_DELIMITERS.map((delim) => (
                            <option key={delim.value} value={delim.value}>
                                {delim.label}
                                {delim.value === rawData.detectedDelimiter
                                    ? " (detected)"
                                    : ""}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mapping-summary cluster">
                <span
                    className={`mapping-count ${getMappingCount("artist") > 0 ? "valid" : "invalid"}`}
                >
                    Artist columns: {getMappingCount("artist")}
                </span>
                <span
                    className={`mapping-count ${getMappingCount("album") > 0 ? "valid" : "invalid"}`}
                >
                    Album columns: {getMappingCount("album")}
                </span>
                {getMappingCount("year") > 0 && (
                    <span className="mapping-count valid">
                        Year columns: {getMappingCount("year")}
                    </span>
                )}
                {!validation.valid && (
                    <span className="mapping-error">{validation.error}</span>
                )}
            </div>

            <div className="column-mapping-table-container">
                <table className="column-mapping-table">
                    <thead>
                        <tr>
                            <th className="col-number">#</th>
                            {Array.from({ length: columnCount }, (_, i) => (
                                <th key={i} className="col-mapping">
                                    <div className="column-header">
                                        <span className="column-label">
                                            Column {i + 1}
                                        </span>
                                        <select
                                            value={
                                                columnMapping.mappings[i] ||
                                                "skip"
                                            }
                                            onChange={(e) =>
                                                handleMappingChange(
                                                    i,
                                                    e.target.value,
                                                )
                                            }
                                            className={`mapping-select ${columnMapping.mappings[i]}`}
                                        >
                                            <option value="skip">Skip</option>
                                            <option value="artist">
                                                Artist
                                            </option>
                                            <option value="album">Album</option>
                                            <option value="year">Year</option>
                                        </select>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {headerRow && (
                            <tr className="header-row">
                                <td className="row-label">Header</td>
                                {headerRow.map((cell: string, i: number) => (
                                    <td key={i} className="header-cell">
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        )}
                        {dataRows.map((row: string[], rowIndex: number) => (
                            <tr key={rowIndex}>
                                <td className="row-label">
                                    Row{" "}
                                    {rowIndex +
                                        (columnMapping.hasHeaderRow ? 2 : 1)}
                                </td>
                                {row.map((cell: string, colIndex: number) => (
                                    <td
                                        key={colIndex}
                                        className={`data-cell ${columnMapping.mappings[colIndex]}`}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {rawData.rows.length > 6 && (
                <p className="preview-more">
                    Showing {dataRows.length} of{" "}
                    {columnMapping.hasHeaderRow
                        ? rawData.rows.length - 1
                        : rawData.rows.length}{" "}
                    rows
                </p>
            )}

            <div className="mapping-actions">
                <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={handleCancel}
                >
                    Back
                </button>
                <button
                    type="button"
                    className="btn btn--primary"
                    onClick={handleContinue}
                    disabled={!validation.valid}
                >
                    Continue to Matching
                </button>
            </div>
        </div>
    );
};
