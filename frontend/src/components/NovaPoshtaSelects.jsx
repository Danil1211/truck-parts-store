import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../assets/NovaPoshtaSelect.css";

const API_URL = import.meta.env.VITE_API_URL || "https://truck-parts-backend.onrender.com";
const POSTOMAT_TYPE = "f9316480-5f2d-425d-bc2c-ac7cd29decf0";
const DELIVERY_TYPES = [
  { key: "warehouse", label: "Отделение" },
  { key: "postomat",  label: "Почтомат" },
  { key: "courier",   label: "Курьер"   },
];

export default function NovaPoshtaSelect({ value = {}, onChange }) {
  const [cityInput, setCityInput] = useState(value.cityName || "");
  const [cityOptions, setCityOptions] = useState([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [cityLoading, setCityLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState(value.city || null);

  const [warehouses, setWarehouses] = useState([]);
  const [warehouseLoading, setWarehouseLoading] = useState(false);

  const [selectedWarehouse, setSelectedWarehouse] = useState(value.warehouse || null);
  const [selectedPostomat, setSelectedPostomat] = useState(value.postomat || null);

  const [selectedDeliveryType, setSelectedDeliveryType] = useState(value.deliveryType || "warehouse");

  const [courierStreet, setCourierStreet] = useState(value.courierStreet || "");
  const [courierHouse, setCourierHouse] = useState(value.courierHouse || "");
  const [courierApartment, setCourierApartment] = useState(value.courierApartment || "");

  const [branchSearch, setBranchSearch] = useState("");
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [postomatSearch, setPostomatSearch] = useState("");
  const [showPostomatDropdown, setShowPostomatDropdown] = useState(false);

  const cityInputRef = useRef();
  const branchInputRef = useRef();
  const postomatInputRef = useRef();

  // === Поиск города ===
  useEffect(() => {
    if (!cityInput || cityInput.length < 2 || selectedCity) {
      setCityOptions([]);
      setShowCityDropdown(false);
      return;
    }
    setCityLoading(true);
    const timeout = setTimeout(() => {
      axios
        .post(`${API_URL}/api/novaposhta/findCities`, { query: cityInput })
        .then(res => {
          setCityOptions(res.data?.data || []);
          setShowCityDropdown(true);
        })
        .catch(() => setCityOptions([]))
        .finally(() => setCityLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [cityInput, selectedCity]);

  // === Получить отделения/почтоматы ===
  useEffect(() => {
    if (!selectedCity?.DeliveryCity) {
      setWarehouses([]);
      return;
    }
    setWarehouseLoading(true);
    axios
      .post(`${API_URL}/api/novaposhta/getWarehouses`, { cityRef: selectedCity.DeliveryCity })
      .then(res => {
        setWarehouses(res.data?.data || []);
        setSelectedWarehouse(null);
        setSelectedPostomat(null);
        setBranchSearch("");
        setPostomatSearch("");
      })
      .catch(() => {
        setWarehouses([]);
        setSelectedWarehouse(null);
        setSelectedPostomat(null);
      })
      .finally(() => setWarehouseLoading(false));
  }, [selectedCity]);

  // --- Фильтрация отделений/почтомат по типу
  const branchList = warehouses.filter(
    w => (w.Description || w.DescriptionRu) && w.TypeOfWarehouse !== POSTOMAT_TYPE
  );
  const postomatList = warehouses.filter(w => w.TypeOfWarehouse === POSTOMAT_TYPE);

  // --- Фильтры поиска
  const filteredBranchList = branchList.filter(wh => {
    const val = branchSearch.trim().toLowerCase();
    if (!val) return true;
    return (
      (wh.DescriptionRu || wh.Description || "").toLowerCase().includes(val) ||
      (wh.ShortAddressRu || wh.ShortAddress || "").toLowerCase().includes(val) ||
      (wh.Number || "").toString().includes(val)
    );
  });
  const filteredPostomatList = postomatList.filter(pm => {
    const val = postomatSearch.trim().toLowerCase();
    if (!val) return true;
    return (
      (pm.DescriptionRu || pm.Description || "").toLowerCase().includes(val) ||
      (pm.ShortAddressRu || pm.ShortAddress || "").toLowerCase().includes(val) ||
      (pm.Number || "").toString().includes(val)
    );
  });

  // --- Выбор города ---
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    setCityInput(city.Present || city.Description);
    setShowCityDropdown(false);
    setSelectedWarehouse(null);
    setSelectedPostomat(null);
    setBranchSearch("");
    setPostomatSearch("");
    onChange?.({
      ...value,
      city,
      cityName: city.Present || city.Description,
      warehouse: null,
      postomat: null,
      deliveryType: selectedDeliveryType,
      courierStreet, courierHouse, courierApartment,
    });
  };

  // --- Выбор отделения ---
  const handleWarehouseSelect = (wh) => {
    setSelectedWarehouse(wh);
    setShowBranchDropdown(false);
    setBranchSearch(wh.DescriptionRu || wh.Description || wh.ShortAddressRu || wh.ShortAddress || "");
    onChange?.({
      ...value,
      city: selectedCity,
      cityName: selectedCity?.Present || selectedCity?.Description,
      warehouse: wh,
      postomat: selectedPostomat,
      deliveryType: selectedDeliveryType,
      courierStreet, courierHouse, courierApartment,
    });
  };

  // --- Выбор почтомата ---
  const handlePostomatSelect = (pm) => {
    setSelectedPostomat(pm);
    setShowPostomatDropdown(false);
    setPostomatSearch(pm.DescriptionRu || pm.Description || pm.ShortAddressRu || pm.ShortAddress || "");
    onChange?.({
      ...value,
      city: selectedCity,
      cityName: selectedCity?.Present || selectedCity?.Description,
      warehouse: selectedWarehouse,
      postomat: pm,
      deliveryType: selectedDeliveryType,
      courierStreet, courierHouse, courierApartment,
    });
  };

  // --- Смена типа доставки (теперь сегменты) ---
  const handleDeliveryTypeChange = (key) => {
    if (key === selectedDeliveryType) return;
    setSelectedDeliveryType(key);
    setSelectedWarehouse(null);
    setSelectedPostomat(null);
    setBranchSearch("");
    setPostomatSearch("");
    onChange?.({
      ...value,
      deliveryType: key,
      warehouse: null,
      postomat: null,
      courierStreet, courierHouse, courierApartment,
    });
  };

  // --- Курьер ---
  const handleCourierStreetChange = (e) => {
    setCourierStreet(e.target.value);
    onChange?.({ ...value, courierStreet: e.target.value, courierHouse, courierApartment });
  };
  const handleCourierHouseChange = (e) => {
    setCourierHouse(e.target.value);
    onChange?.({ ...value, courierStreet, courierHouse: e.target.value, courierApartment });
  };
  const handleCourierApartmentChange = (e) => {
    setCourierApartment(e.target.value);
    onChange?.({ ...value, courierStreet, courierHouse, courierApartment: e.target.value });
  };

  // --- Сброс города ---
  const resetCity = () => {
    setSelectedCity(null);
    setCityInput("");
    setSelectedWarehouse(null);
    setSelectedPostomat(null);
    setWarehouses([]);
    setShowCityDropdown(false);
    setBranchSearch("");
    setPostomatSearch("");
    onChange?.({ ...value, city: null, cityName: "", warehouse: null, postomat: null, deliveryType: selectedDeliveryType });
    cityInputRef.current?.focus();
  };

  // --- Снятие выбранного отделения/почтомата при ручном вводе ---
  useEffect(() => {
    if (!showBranchDropdown && !filteredBranchList.some(wh =>
      (wh.DescriptionRu || wh.Description || wh.ShortAddressRu || wh.ShortAddress || "") === branchSearch
    )) setSelectedWarehouse(null);
  }, [branchSearch]); // eslint-disable-line

  useEffect(() => {
    if (!showPostomatDropdown && !filteredPostomatList.some(pm =>
      (pm.DescriptionRu || pm.Description || pm.ShortAddressRu || pm.ShortAddress || "") === postomatSearch
    )) setSelectedPostomat(null);
  }, [postomatSearch]); // eslint-disable-line

  return (
    <div className="np-row">
      <div>
        <label className="np-label">
          Населённый пункт <span>*</span>
        </label>
        <div style={{ position: "relative" }}>
          <input
            ref={cityInputRef}
            className="np-input"
            type="text"
            value={cityInput}
            readOnly={!!selectedCity}
            onClick={() => selectedCity && resetCity()}
            onChange={e => {
              setCityInput(e.target.value);
              setSelectedCity(null);
              setSelectedWarehouse(null);
              setSelectedPostomat(null);
              setWarehouses([]);
              setShowCityDropdown(true);
              onChange?.({
                ...value,
                city: null,
                cityName: e.target.value,
                warehouse: null,
                postomat: null,
                deliveryType: selectedDeliveryType
              });
            }}
            placeholder="Введите город"
            autoComplete="off"
          />
          {cityLoading && <div className="np-loading">Поиск...</div>}
          {showCityDropdown && cityOptions.length > 0 && !selectedCity && (
            <div className="np-dropdown">
              {cityOptions.map(city => (
                <div
                  key={city.Ref}
                  className="np-dropdown-item"
                  onMouseDown={() => handleCitySelect(city)}
                >
                  {city.Present || city.Description}
                  <span className="np-item-area">{city.AreaDescription || ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="np-flex">
        <div style={{ flex: "1 1 0" }}>
          <label className="np-label">
            {selectedDeliveryType === "warehouse" ? "Отделение" :
             selectedDeliveryType === "postomat"  ? "Почтомат"  : "Улица"} <span>*</span>
          </label>

          {selectedDeliveryType === "warehouse" && (
            <div style={{ position: "relative" }}>
              <input
                className="np-input"
                ref={branchInputRef}
                type="text"
                value={
                  selectedWarehouse
                    ? (selectedWarehouse.DescriptionRu || selectedWarehouse.Description || selectedWarehouse.ShortAddressRu || selectedWarehouse.ShortAddress || "")
                    : branchSearch
                }
                onFocus={() => setShowBranchDropdown(true)}
                onBlur={() => setTimeout(() => setShowBranchDropdown(false), 160)}
                onChange={e => {
                  setBranchSearch(e.target.value);
                  setSelectedWarehouse(null);
                  setShowBranchDropdown(true);
                }}
                placeholder="Поиск по адресу или номеру отделения..."
              />
              <div className="np-dropdown-list" style={{ display: showBranchDropdown ? "block" : "none" }}>
                {filteredBranchList.length === 0 && (
                  <div className="np-dropdown-option np-empty">Ничего не найдено</div>
                )}
                {filteredBranchList.map(wh => (
                  <div
                    key={wh.Ref}
                    className={"np-dropdown-option" + (selectedWarehouse?.Ref === wh.Ref ? " selected" : "")}
                    onMouseDown={() => handleWarehouseSelect(wh)}
                  >
                    {wh.DescriptionRu || wh.Description || wh.ShortAddressRu || wh.ShortAddress || wh.Ref}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDeliveryType === "postomat" && (
            <div style={{ position: "relative" }}>
              <input
                className="np-input"
                ref={postomatInputRef}
                type="text"
                value={
                  selectedPostomat
                    ? (selectedPostomat.DescriptionRu || selectedPostomat.Description || selectedPostomat.ShortAddressRu || selectedPostomat.ShortAddress || "")
                    : postomatSearch
                }
                onFocus={() => setShowPostomatDropdown(true)}
                onBlur={() => setTimeout(() => setShowPostomatDropdown(false), 160)}
                onChange={e => {
                  setPostomatSearch(e.target.value);
                  setSelectedPostomat(null);
                  setShowPostomatDropdown(true);
                }}
                placeholder="Поиск по адресу или номеру почтомата..."
              />
              <div className="np-dropdown-list" style={{ display: showPostomatDropdown ? "block" : "none" }}>
                {filteredPostomatList.length === 0 && (
                  <div className="np-dropdown-option np-empty">Ничего не найдено</div>
                )}
                {filteredPostomatList.map(pm => (
                  <div
                    key={pm.Ref}
                    className={"np-dropdown-option" + (selectedPostomat?.Ref === pm.Ref ? " selected" : "")}
                    onMouseDown={() => handlePostomatSelect(pm)}
                  >
                    {pm.DescriptionRu || pm.Description || pm.ShortAddressRu || pm.ShortAddress || pm.Ref}
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedDeliveryType === "courier" && (
            <div className="np-courier-fields">
              <div>
                <input
                  type="text"
                  className="np-input"
                  value={courierStreet}
                  onChange={handleCourierStreetChange}
                  placeholder="Введите улицу"
                />
              </div>
              <div>
                <input
                  type="text"
                  className="np-input"
                  value={courierHouse}
                  onChange={handleCourierHouseChange}
                  placeholder="Дом"
                />
              </div>
              <div>
                <input
                  type="text"
                  className="np-input"
                  value={courierApartment}
                  onChange={handleCourierApartmentChange}
                  placeholder="Квартира"
                />
              </div>
            </div>
          )}
        </div>

        {/* СЕГМЕНТЫ вместо нативного select */}
        <div className="np-delivery-type" role="radiogroup" aria-label="Способ доставки">
          {DELIVERY_TYPES.map(opt => (
            <label
              key={opt.key}
              className={"np-segment" + (selectedDeliveryType === opt.key ? " is-active" : "")}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleDeliveryTypeChange(opt.key); }
              }}
            >
              <input
                type="radio"
                name="deliveryType"
                value={opt.key}
                checked={selectedDeliveryType === opt.key}
                onChange={() => handleDeliveryTypeChange(opt.key)}
                style={{ display: "none" }}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
