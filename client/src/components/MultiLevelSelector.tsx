import { PallasTool } from '@/lib/pallas';
import React, { useState, useMemo, useCallback, useEffect } from 'react';

interface TestItem {
    name: string;
    selected?: boolean;
}

interface Category {
    name: string;
    expanded?: boolean;
    items: TestItem[];
}

interface TestSelectorProps {
    categories: Category[];
    enabledTests?: Map<string, PallasTool>;
    onRunTests: (selectedTests: SelectedTest[]) => Promise<void>;
}

interface SelectedTest {
    category: string;
    test: string;
}

interface CategoryData {
    expanded: boolean;
    items: Record<string, boolean>;
}

type SelectionData = Record<string, CategoryData>;
type CategoryState = 'none' | 'partial' | 'all';


const createInitialData = (categories: Category[]): SelectionData => {
    return categories.reduce((acc, category) => {
        acc[category.name] = {
            expanded: category.expanded || false,
            items: category.items.reduce((itemAcc, item) => {
                itemAcc[item.name] = item.selected || false;
                return itemAcc;
            }, {} as Record<string, boolean>)
        };
        return acc;
    }, {} as SelectionData);
};

const getCategoryState = (items: Record<string, boolean>): CategoryState => {
    const selectedCount = Object.values(items).filter(Boolean).length;
    const totalCount = Object.values(items).length;

    if (selectedCount === 0) return 'none';
    if (selectedCount === totalCount) return 'all';
    return 'partial';
};

const getTotalSelected = (data: SelectionData): number => {
    return Object.values(data).reduce((total, categoryData) => {
        return total + Object.values(categoryData.items).filter(Boolean).length;
    }, 0);
};

const getSelectedTests = (data: SelectionData): SelectedTest[] => {
    const selected: SelectedTest[] = [];
    Object.entries(data).forEach(([categoryName, categoryData]) => {
        Object.entries(categoryData.items).forEach(([testName, isSelected]) => {
            if (isSelected) {
                selected.push({ category: categoryName, test: testName });
            }
        });
    });
    return selected;
};

const getSelectedSummary = (data: SelectionData): string | null => {
    const summary = Object.entries(data).map(([categoryName, categoryData]) => {
        const selectedItems = Object.entries(categoryData.items)
            .filter(([_, selected]) => selected)
            .map(([item, _]) => item);

        if (selectedItems.length === 0) return null;

        const totalItems = Object.keys(categoryData.items).length;
        if (selectedItems.length === totalItems) {
            return `${categoryName} (All ${totalItems})`;
        } else {
            return `${categoryName} (${selectedItems.length}/${totalItems})`;
        }
    }).filter(Boolean);

    return summary.length > 0 ? summary.join(', ') : null;
};

const filterItems = (items: Record<string, boolean>, searchTerm: string): Record<string, boolean> => {
    if (!searchTerm) return items;

    return Object.entries(items)
        .filter(([itemName]) =>
            itemName.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .reduce((acc, [itemName, selected]) => ({
            ...acc,
            [itemName]: selected
        }), {});
};

const isTestEnabled = (enabledTests: Map<string, PallasTool> | undefined, categoryName: string, testName: string): boolean => {
    if (!enabledTests) return false;
    
    // Check direct match first
    if (enabledTests.has(testName)) return true;
    
    // Check if testName matches the format server-toolName
    const toolKey = `${categoryName}-${testName}`;
    if (enabledTests.has(toolKey)) return true;
    
    // Check if any tool in the map matches this test
    for (const [key, tool] of enabledTests) {
        if (tool.isSameTool(testName) || tool.isSameTool(toolKey)) {
            return true;
        }
    }
    
    return false;
};

const ChevronDown: React.FC<{ className?: string }> = ({ className = "" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
);

const ChevronRight: React.FC<{ className?: string }> = ({ className = "" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
);

const Search: React.FC<{ className?: string }> = ({ className = "" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);

const X: React.FC<{ className?: string }> = ({ className = "" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const Play: React.FC<{ className?: string }> = ({ className = "" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
);

const Clock: React.FC<{ className?: string }> = ({ className = "" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

/**
 * Custom hook for managing test selection state across categories
 */
const useSelection = (initialData: SelectionData) => {
    const [data, setData] = useState<SelectionData>(initialData);

    useEffect(() => {
        setData(initialData);
    }, [initialData]);

    const toggleCategory = useCallback((categoryName: string) => {
        setData(prev => ({
            ...prev,
            [categoryName]: {
                ...prev[categoryName],
                expanded: !prev[categoryName].expanded
            }
        }));
    }, []);

    const selectCategory = useCallback((categoryName: string, enabledTests?: Map<string, PallasTool>) => {
        setData(prev => {
            const items = prev[categoryName].items;
            const enabledItems = Object.entries(items).filter(([testName]) =>
                isTestEnabled(enabledTests, categoryName, testName)
            );
            const selectedEnabledCount = enabledItems.filter(([_, selected]) => selected).length;
            const totalEnabledCount = enabledItems.length;
            const newValue = selectedEnabledCount !== totalEnabledCount;

            return {
                ...prev,
                [categoryName]: {
                    ...prev[categoryName],
                    items: Object.entries(items).reduce((acc, [itemName, currentValue]) => ({
                        ...acc,
                        [itemName]: isTestEnabled(enabledTests, categoryName, itemName) ? newValue : currentValue
                    }), {})
                }
            };
        });
    }, []);

    const selectItem = useCallback((categoryName: string, itemName: string) => {
        setData(prev => ({
            ...prev,
            [categoryName]: {
                ...prev[categoryName],
                items: {
                    ...prev[categoryName].items,
                    [itemName]: !prev[categoryName].items[itemName]
                }
            }
        }));
    }, []);

    return {
        data,
        toggleCategory,
        selectCategory,
        selectItem
    };
};

const useSearch = () => {
    const [searchTerms, setSearchTerms] = useState<Record<string, string>>({});

    const updateSearch = useCallback((categoryName: string, term: string) => {
        setSearchTerms(prev => ({
            ...prev,
            [categoryName]: term
        }));
    }, []);

    return { searchTerms, updateSearch };
};

interface SearchBarProps {
    categoryName: string;
    totalItems: number;
    searchTerm: string;
    onSearchChange: (term: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ categoryName, totalItems, searchTerm, onSearchChange }) => (
    <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
            type="text"
            placeholder={`Search ${totalItems} tests...`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        {searchTerm && (
            <button
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
                <X className="w-4 h-4" />
            </button>
        )}
    </div>
);

interface ItemListProps {
    items: Record<string, boolean>;
    categoryName: string;
    enabledTests?: Map<string, PallasTool>;
    onItemSelect: (categoryName: string, itemName: string) => void;
}

const ItemList: React.FC<ItemListProps> = ({ items, categoryName, enabledTests, onItemSelect }) => {
    if (Object.keys(items).length === 0) {
        return (
            <div className="p-4 text-center text-gray-500">
                No tests match your search
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {Object.entries(items).map(([testName, selected]) => {
                    const enabled = isTestEnabled(enabledTests, categoryName, testName);

                    return (
                        <label
                            key={testName}
                            className={`flex items-center space-x-2 p-2 rounded text-sm border-l-2 border-transparent ${enabled
                                ? 'cursor-pointer hover:bg-gray-50 hover:border-blue-300'
                                : 'cursor-not-allowed opacity-50 bg-gray-25'
                                }`}
                        >
                            <input
                                type="checkbox"
                                checked={selected}
                                disabled={!enabled}
                                onChange={() => enabled && onItemSelect(categoryName, testName)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 flex-shrink-0 disabled:opacity-50"
                            />
                            <span className={`truncate ${enabled ? 'text-gray-700' : 'text-gray-400'}`}>
                                {testName}
                            </span>
                        </label>
                    );
                })}
            </div>
        </div>
    );
};

interface CategoryHeaderProps {
    categoryName: string;
    categoryState: CategoryState;
    isExpanded: boolean;
    selectedCount: number;
    totalCount: number;
    enabledCount: number;
    onToggle: () => void;
    onSelect: () => void;
}

const CategoryHeader: React.FC<CategoryHeaderProps> = ({
    categoryName,
    categoryState,
    isExpanded,
    selectedCount,
    totalCount,
    enabledCount,
    onToggle,
    onSelect
}) => (
    <div className="bg-gray-50 p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
        <div className="flex items-center space-x-3">
            <button
                onClick={onToggle}
                className="p-1 hover:bg-gray-200 rounded"
            >
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                ) : (
                    <ChevronRight className="w-4 h-4" />
                )}
            </button>

            <label className="flex items-center space-x-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={categoryState === 'all'}
                    ref={(el) => {
                        if (el) el.indeterminate = categoryState === 'partial';
                    }}
                    onChange={onSelect}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-gray-900">{categoryName}</span>
            </label>
        </div>

        <div className="text-sm text-gray-500">
            <span>{selectedCount} / {totalCount} selected</span>
            {enabledCount < totalCount && (
                <span className="ml-2 text-xs text-amber-600">
                    ({enabledCount} enabled)
                </span>
            )}
        </div>
    </div>
);

interface CategorySectionProps {
    categoryName: string;
    categoryData: CategoryData;
    categoryState: CategoryState;
    searchTerm: string;
    filteredItems: Record<string, boolean>;
    enabledTests?: Map<string, PallasTool>;
    onToggle: (categoryName: string) => void;
    onSelect: (categoryName: string) => void;
    onItemSelect: (categoryName: string, itemName: string) => void;
    onSearchChange: (categoryName: string, term: string) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
    categoryName,
    categoryData,
    categoryState,
    searchTerm,
    filteredItems,
    enabledTests,
    onToggle,
    onSelect,
    onItemSelect,
    onSearchChange
}) => {
    const enabledCount = useMemo(() => {
        return Object.keys(categoryData.items).filter(testName =>
            isTestEnabled(enabledTests, categoryName, testName)
        ).length;
    }, [categoryData.items, enabledTests, categoryName]);

    return (
        <div className="border rounded-lg overflow-hidden">
            <CategoryHeader
                categoryName={categoryName}
                categoryState={categoryState}
                isExpanded={categoryData.expanded}
                selectedCount={Object.values(categoryData.items).filter(Boolean).length}
                totalCount={Object.keys(categoryData.items).length}
                enabledCount={enabledCount}
                onToggle={() => onToggle(categoryName)}
                onSelect={() => onSelect(categoryName)}
            />

            {categoryData.expanded && (
                <div className="bg-white border-t">
                    <div className="p-4 border-b bg-gray-25">
                        <SearchBar
                            categoryName={categoryName}
                            totalItems={Object.keys(categoryData.items).length}
                            searchTerm={searchTerm}
                            onSearchChange={(term) => onSearchChange(categoryName, term)}
                        />
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        <ItemList
                            items={filteredItems}
                            categoryName={categoryName}
                            enabledTests={enabledTests}
                            onItemSelect={onItemSelect}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

interface SelectionSummaryProps {
    totalSelected: number;
    selectedSummary: string | null;
    onRun: () => void;
    isRunning: boolean;
}

const SelectionSummary: React.FC<SelectionSummaryProps> = ({ totalSelected, selectedSummary, onRun, isRunning }) => (
    <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-3">
            <div>
                <span className="font-medium">Selected: {totalSelected} tests</span>
                <span className="text-sm text-gray-600 ml-4">
                    {totalSelected === 0 ? 'Select tests to run' : 'Ready to execute'}
                </span>
            </div>

            <button
                onClick={onRun}
                disabled={isRunning || totalSelected === 0}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${isRunning
                    ? 'bg-orange-100 text-orange-700 cursor-not-allowed'
                    : totalSelected === 0
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg transform hover:scale-105'
                    }`}
            >
                {isRunning ? (
                    <>
                        <Clock className="w-5 h-5 animate-spin" />
                        <span>Running Tests...</span>
                    </>
                ) : (
                    <>
                        <Play className="w-5 h-5" />
                        <span>Run {totalSelected} Tests</span>
                    </>
                )}
            </button>
        </div>

        {selectedSummary && (
            <div className="text-sm text-gray-700 bg-white p-3 rounded border max-h-24 overflow-y-auto">
                {selectedSummary}
            </div>
        )}
    </div>
);

/**
 * MultiLevelSelector - A comprehensive test selection interface
 * Manages hierarchical test categories with search, filtering, and batch operations
 */
const MultiLevelSelector: React.FC<TestSelectorProps> = ({ categories, enabledTests, onRunTests }) => {
    const [isRunning, setIsRunning] = useState(false);

    const initialData = useMemo(() => createInitialData(categories), [categories]);

    const selection = useSelection(initialData);
    const search = useSearch();

    const totalSelected = useMemo(() => getTotalSelected(selection.data), [selection.data]);
    const selectedTests = useMemo(() => getSelectedTests(selection.data), [selection.data]);
    const selectedSummary = useMemo(() => getSelectedSummary(selection.data), [selection.data]);

    const handleRunTests = useCallback(async () => {
        if (totalSelected === 0) return;

        setIsRunning(true);
        try {
            await onRunTests(selectedTests);
        } finally {
            setIsRunning(false);
        }
    }, [totalSelected, selectedTests, onRunTests]);

    const handleSelectCategory = useCallback((categoryName: string) => {
        selection.selectCategory(categoryName, enabledTests);
    }, [selection.selectCategory, enabledTests]);

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-4">Test Suite Selection</h2>
                <SelectionSummary
                    totalSelected={totalSelected}
                    selectedSummary={selectedSummary}
                    onRun={handleRunTests}
                    isRunning={isRunning}
                />
            </div>

            <div className="space-y-2">
                {Object.entries(selection.data).map(([categoryName, categoryData]) => {
                    const categoryState = getCategoryState(categoryData.items);
                    const filteredItems = filterItems(categoryData.items, search.searchTerms[categoryName] || '');

                    return (
                        <CategorySection
                            key={categoryName}
                            categoryName={categoryName}
                            categoryData={categoryData}
                            categoryState={categoryState}
                            searchTerm={search.searchTerms[categoryName] || ''}
                            filteredItems={filteredItems}
                            enabledTests={enabledTests}
                            onToggle={selection.toggleCategory}
                            onSelect={handleSelectCategory}
                            onItemSelect={selection.selectItem}
                            onSearchChange={search.updateSearch}
                        />
                    );
                })}
            </div>
        </div>
    );
};


export type { TestSelectorProps, Category, TestItem, SelectedTest };
export { MultiLevelSelector };