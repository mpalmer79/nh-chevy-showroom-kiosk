import React, { useState, useEffect, ChangeEvent } from 'react';
import styles from '../../modelBudgetSelectorStyles';
import type { StepProps, ColorChoices } from '../types';
import type { Vehicle, AvailableModel, GMColor } from '../../../types';
import GM_COLORS from '../../../types/gmColors';
import { toSlug } from '../constants';
import api from '../../api';

interface ColorSelectionProps extends StepProps {
  modelSlug: string;
  cabSlug?: string;
}

// Match an inventory color string to a GM_COLORS entry
// e.g. "Apex Red" in inventory matches "Apex Red" in GM_COLORS
// Also handles partial/fuzzy: "Sterling Gray" matches "Sterling Gray Metallic"
const colorMatchesGM = (inventoryColor: string, gmColorName: string): boolean => {
  const inv = inventoryColor.toLowerCase().trim();
  const gm = gmColorName.toLowerCase().trim();
  if (inv === gm) return true;
  // Check if one contains the other (handles "Sterling Gray" vs "Sterling Gray Metallic")
  if (gm.includes(inv) || inv.includes(gm)) return true;
  // Check first two words match (e.g. "Mosaic Black" matches "Mosaic Black Metallic")
  const invWords = inv.split(/\s+/).slice(0, 2).join(' ');
  const gmWords = gm.split(/\s+/).slice(0, 2).join(' ');
  if (invWords.length > 3 && invWords === gmWords) return true;
  return false;
};

const ColorSelection: React.FC<ColorSelectionProps> = ({ 
  state,
  updateState,
  navigateTo, 
  vehicleCategories,
  inventoryByModel,
  modelSlug,
  cabSlug,
}) => {
  const [colorChoices, setColorChoices] = useState<ColorChoices>(state.colorChoices);
  const [inStockColors, setInStockColors] = useState<string[]>([]);
  const [loadingColors, setLoadingColors] = useState<boolean>(true);
  
  // Find the model across all categories
  let foundModel: AvailableModel | null = null;
  let foundCategoryKey: string | null = null;
  
  for (const [categoryKey, category] of Object.entries(vehicleCategories)) {
    const model = category.models.find(m => toSlug(m.name) === modelSlug);
    if (model) {
      foundModel = model;
      foundCategoryKey = categoryKey;
      break;
    }
  }

  // MOVED: useEffect MUST be called before any early returns
  // Sync local state with parent state
  useEffect(() => {
    if (foundModel) {
      updateState({ 
        selectedModel: foundModel,
        selectedCab: cabSlug ? cabSlug.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ') : null,
      });
    }
  }, [foundModel, cabSlug, updateState]);

  // Fetch actual inventory for this model to get in-stock colors
  useEffect(() => {
    if (!foundModel) return;

    const fetchColors = async () => {
      setLoadingColors(true);
      try {
        const data = await api.getInventory({ model: foundModel!.name });
        const vehicles: Vehicle[] = Array.isArray(data)
          ? data
          : (data as { vehicles?: Vehicle[] }).vehicles || [];

        // Extract unique exterior colors from inventory
        const colorSet = new Set<string>();
        vehicles.forEach((v) => {
          const color = (v.exteriorColor || v.exterior_color || '').trim();
          if (color) colorSet.add(color);
        });
        setInStockColors(Array.from(colorSet));
      } catch (err) {
        console.warn('Failed to fetch model inventory for colors:', err);
        // On error, don't filter - show all GM colors
        setInStockColors([]);
      } finally {
        setLoadingColors(false);
      }
    };

    fetchColors();
  }, [foundModel]);

  // If model not found, redirect (AFTER all hooks)
  if (!foundModel) {
    setTimeout(() => navigateTo('modelBudget/category'), 0);
    return null;
  }

  const inventoryCount = inventoryByModel[foundModel.name] || 0;
  const allColors: GMColor[] = GM_COLORS[foundModel.name] || GM_COLORS['Equinox'];

  // Filter GM colors to only those matching in-stock exterior colors
  // If we have no in-stock data (error or still loading), show all colors as fallback
  const colors: GMColor[] = inStockColors.length > 0
    ? allColors.filter(gmColor =>
        inStockColors.some(invColor => colorMatchesGM(invColor, gmColor.name))
      )
    : loadingColors ? [] : allColors;

  const availableForSecond = colors.filter(c => c.name !== colorChoices.first);

  const handleColorChange = (choice: keyof ColorChoices, value: string): void => {
    const newChoices = { ...colorChoices, [choice]: value };
    // If user changed first choice and it now matches second, clear second
    if (choice === 'first' && value === colorChoices.second) {
      newChoices.second = '';
    }
    setColorChoices(newChoices);
    updateState({ colorChoices: newChoices });
  };

  const handleContinue = (): void => {
    updateState({ colorChoices });
    const basePath = cabSlug 
      ? `modelBudget/budget/${modelSlug}/${cabSlug}`
      : `modelBudget/budget/${modelSlug}`;
    navigateTo(basePath);
  };

  const handleBack = (): void => {
    if (foundModel?.cabOptions && foundModel.cabOptions.length > 0) {
      navigateTo(`modelBudget/cab/${modelSlug}`);
    } else if (foundCategoryKey) {
      navigateTo(`modelBudget/model/${toSlug(foundCategoryKey)}`);
    } else {
      navigateTo('modelBudget/category');
    }
  };

  return (
    <div style={styles.stepContainer}>
      <button style={styles.backButton} onClick={handleBack}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>
      <div style={styles.stepHeader}>
        <h1 style={styles.stepTitle}>Color Preferences</h1>
        <p style={styles.stepSubtitle}>
          {inventoryCount > 0 && `We have ${inventoryCount} ${foundModel.name} vehicles in stock`}
        </p>
      </div>
      <div style={styles.formSection}>
        <p style={styles.formIntro}>
          {colors.length > 0
            ? `Select up to 2 GM colors for ${foundModel.name} in order of preference:`
            : loadingColors
              ? `Loading available colors...`
              : `Select up to 2 GM colors for ${foundModel.name} in order of preference:`
          }
        </p>
        <div style={styles.colorSelects}>
          <div style={styles.colorSelectGroup}>
            <label style={styles.inputLabel}>First Choice</label>
            <select 
              style={styles.selectInput} 
              value={colorChoices.first} 
              onChange={(e: ChangeEvent<HTMLSelectElement>) => handleColorChange('first', e.target.value)}
              disabled={loadingColors}
            >
              <option value="">Select a color...</option>
              {colors.map((color) => (
                <option key={color.code} value={color.name}>
                  {color.name} {color.premium && `(+$${color.price})`}
                </option>
              ))}
            </select>
            {colorChoices.first && (
              <div style={styles.colorPreview}>
                <div style={{...styles.colorSwatch, backgroundColor: allColors.find(c => c.name === colorChoices.first)?.hex || '#666'}} />
                <span>{colorChoices.first}</span>
              </div>
            )}
          </div>
          <div style={styles.colorSelectGroup}>
            <label style={styles.inputLabel}>Second Choice</label>
            <select 
              style={{...styles.selectInput, opacity: colorChoices.first ? 1 : 0.5}} 
              value={colorChoices.second} 
              onChange={(e: ChangeEvent<HTMLSelectElement>) => handleColorChange('second', e.target.value)} 
              disabled={!colorChoices.first}
            >
              <option value="">Select a color...</option>
              {availableForSecond.map((color) => (
                <option key={color.code} value={color.name}>
                  {color.name} {color.premium && `(+$${color.price})`}
                </option>
              ))}
            </select>
            {colorChoices.second && (
              <div style={styles.colorPreview}>
                <div style={{...styles.colorSwatch, backgroundColor: allColors.find(c => c.name === colorChoices.second)?.hex || '#666'}} />
                <span>{colorChoices.second}</span>
              </div>
            )}
          </div>
        </div>
        <button style={styles.continueButton} onClick={handleContinue}>
          Continue to Budget
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ColorSelection;
