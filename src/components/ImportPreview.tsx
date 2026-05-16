import type { FC } from "react";
import { useState } from "react";
import { useAppSelector, useAppDispatch } from "../reduxhooks.ts";
import {
    selectMatch,
    saveUnmatchedToPending,
    startImporting,
    clearCurrentImport,
    type ImportItem,
    type MatchStatus,
} from "../store/importQueue.ts";
import { addItem } from "../store/wishlist.ts";
import type { MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";

interface ImportPreviewProps {
    onBack: () => void;
    onComplete: () => void;
}

export const ImportPreview: FC<ImportPreviewProps> = ({
    onBack,
    onComplete,
}) => {
    const dispatch = useAppDispatch();
    const { items, status, progress } = useAppSelector(
        (state) => state.importQueue.currentImport,
    );
    const [selectedForImport, setSelectedForImport] = useState<Set<string>>(
        () =>
            new Set(
                items
                    .filter((i) => i.status === "matched" && i.selectedMatch)
                    .map((i) => i.id),
            ),
    );

    const matchedCount = items.filter(
        (i) => i.status === "matched" && i.selectedMatch,
    ).length;
    const unmatchedCount = items.filter((i) => i.status === "unmatched").length;
    const multipleCount = items.filter((i) => i.status === "multiple").length;

    const handleToggleSelection = (itemId: string) => {
        const newSelected = new Set(selectedForImport);
        if (newSelected.has(itemId)) {
            newSelected.delete(itemId);
        } else {
            newSelected.add(itemId);
        }
        setSelectedForImport(newSelected);
    };

    const handleSelectAllMatched = () => {
        const allMatched = items
            .filter((i) => i.status === "matched" && i.selectedMatch)
            .map((i) => i.id);
        setSelectedForImport(new Set(allMatched));
    };

    const handleDeselectAll = () => {
        setSelectedForImport(new Set());
    };

    const handleManualSelect = (item: ImportItem, match: MusicbrainzMeta) => {
        dispatch(selectMatch({ itemId: item.id, match }));
        // Auto-select when manually matched
        setSelectedForImport((prev) => new Set([...prev, item.id]));
    };

    const handleImport = async () => {
        dispatch(startImporting());

        const itemsToImport = items.filter(
            (i) =>
                selectedForImport.has(i.id) && i.selectedMatch?.releaseGroupId,
        );

        for (const item of itemsToImport) {
            if (item.selectedMatch?.releaseGroupId) {
                dispatch(addItem({ id: item.selectedMatch.releaseGroupId }));
            }
        }

        // Save unmatched to pending queue
        if (unmatchedCount > 0 || multipleCount > 0) {
            dispatch(saveUnmatchedToPending());
        }

        dispatch(clearCurrentImport());
        onComplete();
    };

    const handleCancel = () => {
        dispatch(saveUnmatchedToPending());
        dispatch(clearCurrentImport());
        onBack();
    };

    const getStatusIcon = (status: MatchStatus) => {
        switch (status) {
            case "matched":
                return "✓";
            case "unmatched":
                return "✗";
            case "multiple":
                return "?";
            case "matching":
                return "...";
            case "pending":
                return "○";
            case "error":
                return "!";
            default:
                return "?";
        }
    };

    const getStatusClass = (status: MatchStatus) => {
        switch (status) {
            case "matched":
                return "status-matched";
            case "unmatched":
                return "status-unmatched";
            case "multiple":
                return "status-multiple";
            case "matching":
                return "status-matching";
            case "pending":
                return "status-pending";
            case "error":
                return "status-error";
            default:
                return "";
        }
    };

    if (status === "matching") {
        return (
            <div className="import-preview">
                <h3>Finding Matches...</h3>
                <div className="matching-progress">
                    <progress
                        value={progress?.current ?? 0}
                        max={progress?.total ?? 1}
                    />
                    <p>
                        Matching {progress?.current ?? 0} of{" "}
                        {progress?.total ?? 0} albums...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="import-preview">
            <h3>Preview Import</h3>

            <div className="import-stats cluster">
                <span className="stat stat--matched">
                    ✓ {matchedCount} matched
                </span>
                {unmatchedCount > 0 && (
                    <span className="stat stat--unmatched">
                        ✗ {unmatchedCount} unmatched
                    </span>
                )}
                {multipleCount > 0 && (
                    <span className="stat stat--multiple">
                        ? {multipleCount} need selection
                    </span>
                )}
            </div>

            <div className="import-actions-bar repel">
                <div className="cluster">
                    <button
                        type="button"
                        className="btn btn--small"
                        onClick={handleSelectAllMatched}
                    >
                        Select All Matched
                    </button>
                    <button
                        type="button"
                        className="btn btn--small"
                        onClick={handleDeselectAll}
                    >
                        Deselect All
                    </button>
                </div>
                <span className="selection-count">
                    {selectedForImport.size} selected
                </span>
            </div>

            <div className="import-table-container">
                <table className="import-table">
                    <thead>
                        <tr>
                            <th className="col-select">
                                <input
                                    type="checkbox"
                                    checked={
                                        matchedCount > 0 &&
                                        selectedForImport.size === matchedCount
                                    }
                                    onChange={(e) =>
                                        e.target.checked
                                            ? handleSelectAllMatched()
                                            : handleDeselectAll()
                                    }
                                />
                            </th>
                            <th className="col-status">Status</th>
                            <th className="col-artist">Artist</th>
                            <th className="col-album">Album</th>
                            <th className="col-match">Matched Release</th>
                            <th className="col-action">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                className={`status-${item.status} ${
                                    selectedForImport.has(item.id)
                                        ? "selected"
                                        : ""
                                }`}
                            >
                                <td className="col-select">
                                    <input
                                        type="checkbox"
                                        checked={selectedForImport.has(item.id)}
                                        onChange={() =>
                                            handleToggleSelection(item.id)
                                        }
                                        disabled={
                                            item.status !== "matched" ||
                                            !item.selectedMatch
                                        }
                                    />
                                </td>
                                <td className="col-status">
                                    <span
                                        className={`status-icon ${getStatusClass(item.status)}`}
                                    >
                                        {getStatusIcon(item.status)}
                                    </span>
                                </td>
                                <td className="col-artist">
                                    {item.artist || "—"}
                                </td>
                                <td className="col-album">{item.album}</td>
                                <td className="col-match">
                                    {item.selectedMatch ? (
                                        <span className="match-info">
                                            {item.selectedMatch.artist} —{" "}
                                            {item.selectedMatch.albumTitle}
                                            {item.selectedMatch.type && (
                                                <span className="match-type">
                                                    ({item.selectedMatch.type})
                                                </span>
                                            )}
                                        </span>
                                    ) : item.matches.length > 0 ? (
                                        <span className="match-options">
                                            {item.matches.length} options
                                        </span>
                                    ) : (
                                        <span className="no-match">
                                            No match found
                                        </span>
                                    )}
                                </td>
                                <td className="col-action">
                                    {item.status === "multiple" &&
                                        item.matches.length > 0 && (
                                            <select
                                                value={
                                                    item.selectedMatch
                                                        ?.releaseGroupId || ""
                                                }
                                                onChange={(e) => {
                                                    const match =
                                                        item.matches.find(
                                                            (m) =>
                                                                m.releaseGroupId ===
                                                                e.target.value,
                                                        );
                                                    if (match) {
                                                        handleManualSelect(
                                                            item,
                                                            match,
                                                        );
                                                    }
                                                }}
                                            >
                                                <option value="">
                                                    Select match...
                                                </option>
                                                {item.matches.map((match) => (
                                                    <option
                                                        key={
                                                            match.releaseGroupId
                                                        }
                                                        value={
                                                            match.releaseGroupId
                                                        }
                                                    >
                                                        {match.artist} —{" "}
                                                        {match.albumTitle}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    {item.status === "unmatched" && (
                                        <button
                                            type="button"
                                            className="btn btn--small"
                                            onClick={() => {
                                                // Could open a search dialog here
                                                alert(
                                                    `Manual search not implemented yet. You can try editing the import data and re-importing.`,
                                                );
                                            }}
                                        >
                                            Search
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div
                className="import-actions"
                style={{ display: "flex", justifyContent: "flex-end" }}
            >
                <div className="cluster">
                    <button
                        type="button"
                        className="btn btn--secondary"
                        onClick={handleCancel}
                    >
                        Back
                    </button>
                    <button
                        type="button"
                        className="btn btn--success"
                        onClick={handleImport}
                        disabled={selectedForImport.size === 0}
                    >
                        Import {selectedForImport.size} Items
                    </button>
                </div>
            </div>

            {(unmatchedCount > 0 || multipleCount > 0) && (
                <p className="pending-notice">
                    Unmatched items will be saved to your Pending Queue for
                    later.
                </p>
            )}
        </div>
    );
};
