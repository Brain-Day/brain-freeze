var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var core_1 = require('@angular/core');
// Purpose of Store is to have one state container for the whole app.
// Only COMBINEREDUCERS, GETSTATE, DISPATCH, and SUBSCRIBE should be invoked from outside this component.
var StoreService = (function () {
    function StoreService() {
        this.mode = 'dev'; // Set to 'dev' to save history of complete state objects, 'devlite' to save changing key-value pairs, and anything else to save only action objects.
        this.stateLocked = false; // When set to true (triggered by action.lock === true), state cannot be mutated until it is unlocked (triggered by action.unlock === true).
        this.lockedKeys = []; // Partial locking. Contains array of state properties (in dot notation, even for arrays) that should be locked.
        this.globalListeners = []; // Array of listeners to be trigger on any state change.
        this.partialListeners = {}; // Keys in this object are key paths. Values are array of listeners.
        this.history = []; // Should always contain deep copies of states and listeners arrays, including current status of each.
        // Styles object used to style console logs in the browser.
        this.styles = {
            info: 'color: #7733CC',
            cannotMutateState: 'color: white; background: #CC0099; border: 1px solid #990000',
            alertFlag: 'color: red;',
            stateUnchangedByReducers: 'color: white; background: #00CC99; border: 1px solid #990000'
        };
    }
    // Return either type of input or a Boolean of whether or not input matches a given type
    StoreService.prototype.typeOf = function (input, check) {
        if (check === void 0) { check = null; }
        var type = Object.prototype.toString.call(input).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
        return check ? type === check : type;
    };
    // Returns a deep clone and optionally deep frozen copy of an object.
    StoreService.prototype.deepClone = function (obj, freeze) {
        if (freeze === void 0) { freeze = false; }
        if (!this.typeOf(obj, 'object') && !this.typeOf(obj, 'array'))
            return obj;
        var newObj = this.typeOf(obj, 'array') ? [] : {};
        for (var key in obj)
            newObj[key] = (this.typeOf(obj, 'object') || this.typeOf(obj, 'array')) ? this.deepClone(obj[key]) : obj[key];
        return freeze ? Object.freeze(newObj) : newObj;
    };
    // Compares two objects at every level and returns boolean indicating if they are the same.
    StoreService.prototype.deepCompare = function (obj1, obj2) {
        if (this.typeOf(obj1) !== this.typeOf(obj2))
            return false;
        if (this.typeOf(obj1, 'function'))
            return obj1.toString() === obj2.toString();
        if (!this.typeOf(obj1, 'object') && !this.typeOf(obj1, 'array'))
            return obj1 === obj2;
        if (Object.keys(obj1).sort().toString() !== Object.keys(obj2).sort().toString())
            return false;
        for (var key in obj1)
            if (!this.deepCompare(obj1[key], obj2[key]))
                return false;
        return true;
    };
    // Takes dot notation key path and returns nested value
    StoreService.prototype.getNestedValue = function (obj, keyPath) {
        return eval("obj['" + keyPath.replace(/\./g, "']['") + "']");
    };
    // Returns array of all key paths in an object.
    StoreService.prototype.getAllKeys = function (obj, keyPath) {
        if (keyPath === void 0) { keyPath = null; }
        if (!this.typeOf(obj, 'object') && !this.typeOf(obj, 'array'))
            return {};
        var keyPaths = {};
        var prefix = keyPath === null ? '' : keyPath + ".";
        for (var key in obj) {
            keyPaths[("" + prefix + key)] = true;
            if (this.typeOf(obj[key], 'object') || this.typeOf(obj[key], 'array')) {
                for (var nestKey in this.getAllKeys(obj[key], "" + prefix + key)) {
                    keyPaths[nestKey] = true;
                }
            }
        }
        return keyPaths;
    };
    // Returns array of keys from obj1 that are not the same in obj2. Will not return
    // keys from obj2 that are not in obj1.
    StoreService.prototype.keyPathsChanged = function (obj1, obj2) {
        var allKeyPaths1 = this.getAllKeys(obj1);
        var allKeyPaths2 = this.getAllKeys(obj2);
        var changedKeyPaths = {};
        var needToCheck = {};
        for (var key in allKeyPaths1) {
            if (key in allKeyPaths2)
                needToCheck[key] = true;
            else
                changedKeyPaths[key] = { VALUE_BEFORE: this.getNestedValue(obj1, key), VALUE_AFTER: undefined };
        }
        for (var key in needToCheck) {
            var val1 = this.getNestedValue(obj1, key);
            var val2 = this.getNestedValue(obj2, key);
            if (this.deepCompare(val1, val2)) {
                for (var lookKey in needToCheck) {
                    var firstDotIndex = lookKey.indexOf('.');
                    if (firstDotIndex !== -1 && lookKey.slice(0, firstDotIndex) === key)
                        delete needToCheck[lookKey];
                }
            }
            else
                changedKeyPaths[key] = { VALUE_BEFORE: val1, VALUE_AFTER: val2 };
        }
        return changedKeyPaths;
    };
    // Saves a history of state in the form of an array of deep cloned, deep frozen copies.
    StoreService.prototype.saveHistory = function (action, changes) {
        // Dev Mode.
        switch (this.mode) {
            case 'dev':
                this.history.push({
                    // String describing if state or listener was changed to prompt a new save in history.
                    CHANGE_TYPE: changes['CHANGE_TYPE'],
                    // Object of deep cloned and deep frozen copies of all past and present listeners arrays.
                    CURRENT_LISTENERS: {
                        GLOBAL: this.deepClone(this.globalListeners, true),
                        PARTIAL: this.deepClone(this.partialListeners, true)
                    },
                    // Keys locked.
                    CURRENT_LOCKED_KEYS: this.lockedKeys.slice(0),
                    // Keys changed from previous state.
                    KEYPATHS_CHANGED: changes['KEYPATHS_CHANGED'] ? changes['KEYPATHS_CHANGED'] : [],
                    // Deep cloned and deep frozen copes of all past and present state objects.
                    STATE: this.deepClone(this.state, true)
                });
                // Log out history.
                console.groupCollapsed("Store.SAVEHISTORY: " + changes['CHANGE_TYPE']);
                console.dir(this.history.filter(function (h) { return h['CHANGE_TYPE'] === "" + changes['CHANGE_TYPE']; }));
                console.groupEnd();
                break;
            // Not in Dev Mode. Just record changes.
            case 'devlite':
                this.history.push(this.deepClone(action, true), this.deepClone(changes, true));
                console.groupCollapsed("Store.SAVEHISTORY: " + changes['CHANGE_TYPE']);
                console.dir(this.history.filter(function (h) { return h['CHANGE_TYPE'] === "" + changes['CHANGE_TYPE']; }));
                console.groupEnd();
                break;
            default:
                this.history.push(this.deepClone(action, true));
        }
    };
    // Takes in an object in the same shape of desired state object, with values
    // being the return values of smaller reducer functions that are to be run with
    // previous(smaller) state object and (same) action object passed in.
    StoreService.prototype.combineReducers = function (reducerObj) {
        this.mainReducer = reducerObj;
        var newState = {};
        for (var n in this.mainReducer)
            newState[n] = this.mainReducer[n](null, {});
        this.state = newState;
    };
    // Returns a deep clone of state.
    StoreService.prototype.getState = function () { return this.deepClone(this.state, false); };
    // Takes in action objects and checks for lock related commands before running state through reducers.
    StoreService.prototype.dispatch = function (action) {
        var _this = this;
        if (this.mode === 'dev' || this.mode === 'devlite') {
            console.groupCollapsed("Store.DISPATCH: " + Object.keys(action).map(function (e) { return (e + ":" + action[e]); }));
            console.log("Action object received:");
            console.dir(action);
        }
        // Checking for Dev Mode command. If set to true, history is not saved and
        // console.groupEnd is never called, putting all console logs in one group.
        if ('mode' in action) {
            this.mode = action['mode'];
            // Only close console grouping to show console logs if in Dev Mode.
            // Otherwise, don't close console grouping and collect console logs.
            if (action['mode'] === 'dev' || action['mode'] === 'devlite')
                console.groupEnd();
            return;
        }
        // Locking specific keys.
        if (action['lockKeys']) {
            var newKeys = action['lockKeys'].filter(function (e) { return _this.lockedKeys.indexOf(e) === -1; });
            var alreadyLocked = action['lockKeys'].filter(function (e) { return _this.lockedKeys.indexOf(e) > -1; });
            this.lockedKeys = this.lockedKeys.concat(newKeys);
            if (this.mode === 'dev' || this.mode === 'devlite') {
                console.groupCollapsed("Keys locked:");
                console.dir(newKeys);
                console.groupEnd();
                if (alreadyLocked.length) {
                    console.groupCollapsed("Keys already locked:");
                    console.dir(alreadyLocked);
                    console.groupEnd();
                }
                console.groupEnd();
                return;
            }
        }
        // Unlocking specific keys.
        if (action['unlockKeys']) {
            var newKeys = action['unlockKeys'].filter(function (e) { return _this.lockedKeys.indexOf(e) > -1; });
            var alreadyUnlocked = action['unlockKeys'].filter(function (e) { return _this.lockedKeys.indexOf(e) === -1; });
            this.lockedKeys = this.lockedKeys.filter(function (e) { return newKeys.indexOf(e) === -1; });
            if (this.mode === 'dev' || this.mode === 'devlite') {
                console.groupCollapsed("Keys unlocked:");
                console.dir(newKeys);
                console.groupEnd();
                if (alreadyUnlocked.length) {
                    console.groupCollapsed("Keys already unlocked:");
                    console.dir(alreadyUnlocked);
                    console.groupEnd();
                }
                console.groupEnd();
                return;
            }
        }
        // Checking for lockState command.
        if (action['lockState']) {
            this.stateLocked = true;
            if (this.mode === 'dev' || this.mode === 'devlite') {
                console.log("State locked.");
                console.groupEnd();
            }
            return;
        }
        // Checking for unlockState command.
        if (action['unlockState']) {
            this.stateLocked = false;
            if (this.mode === 'dev' || this.mode === 'devlite') {
                console.log("State unlocked.");
                console.groupEnd();
            }
            return;
        }
        // Checking if entire state is locked.
        if (this.stateLocked) {
            if (this.mode === 'dev' || this.mode === 'devlite') {
                console.log("%cState change operation rejected: State is locked.", this.styles['cannotMutateState']);
                console.groupEnd();
            }
            return;
        }
        // Proceeding with reducers.
        var newState = this.deepClone(this.state, false);
        for (var n in this.mainReducer)
            newState[n] = this.mainReducer[n](newState[n], action);
        // Getting changed keys.
        var changedKeyPathsHistory = this.keyPathsChanged(this.state, newState);
        var changedKeyPaths = Object.keys(changedKeyPathsHistory);
        // If there were attempts to change locked keys, console log an array of the would-be affected locked keys and return a deep clone of state.
        var changedLockedKeys = {};
        for (var key in this.lockedKeys)
            if (key in changedKeyPathsHistory)
                changedLockedKeys[key] = changedKeyPathsHistory[key];
        if (Object.keys(changedLockedKeys).length) {
            if (this.mode === 'dev' || this.mode === 'devlite') {
                console.log.apply(console, ["%cState change operation rejected: Cannot change locked keys:", this.styles['cannotMutateState']].concat(changedLockedKeys));
                console.groupEnd();
            }
            return;
        }
        // Return current state if reducers did not change state.
        if (this.deepCompare(this.state, newState)) {
            if (this.mode === 'dev' || this.mode === 'devlite') {
                console.log("%cState unchanged by reducers: History not updated.", this.styles['stateUnchangedByReducers']);
                console.groupEnd();
            }
            return;
        }
        // Mutate state, update history, and return new state if reducers changed state.
        this.state = newState;
        if (this.mode === 'dev' || this.mode === 'devlite')
            console.groupEnd();
        this.saveHistory(action, { CHANGE_TYPE: 'STATE', KEYPATHS_CHANGED: changedKeyPathsHistory });
        // Loop through all arrays of partial listeners.
        for (var keyPath in this.partialListeners)
            if (changedKeyPaths.indexOf(keyPath) > -1)
                this.partialListeners[keyPath].forEach(function (l) { return l(_this.getNestedValue(_this.state, keyPath)); });
        // Loop through the global array of listeners.
        this.globalListeners.forEach(function (l) { return l(_this.deepClone(_this.state, false)); });
    };
    // Subscribes a listener function to state changes and returns a function to unsubscribe the same listener function.
    StoreService.prototype.subscribe = function (fn, keyPath) {
        var _this = this;
        if (keyPath === void 0) { keyPath = ''; }
        // Key path is passed in. Subscribe listener to that specific key path only.
        if (keyPath !== '') {
            this.partialListeners[("" + keyPath)] = this.partialListeners[("" + keyPath)] ? this.partialListeners[("" + keyPath)].concat(fn) : [fn];
            this.saveHistory({}, { CHANGE_TYPE: 'ADD_LISTENER', LISTENER_TYPE: 'PARTIAL', LISTENER: fn });
            return function () {
                _this.partialListeners[("" + keyPath)] = _this.partialListeners[("" + keyPath)].filter(function (func) { return func !== fn; });
                if (!_this.partialListeners[("" + keyPath)].length)
                    delete _this.partialListeners[("" + keyPath)];
                _this.saveHistory({}, { CHANGE_TYPE: 'DEL_LISTENER', LISTENER_TYPE: 'PARTIAL', LISTENER: fn });
            };
        }
        // Key path not passed in. Subscribe listener to entire state object.
        this.globalListeners = this.globalListeners.concat(fn);
        this.saveHistory({}, { CHANGE_TYPE: 'ADD_LISTENER', LISTENER_TYPE: 'GLOBAL', LISTENER: fn });
        return function () {
            _this.globalListeners = _this.globalListeners.filter(function (func) { return func !== fn; });
            _this.saveHistory({}, { CHANGE_TYPE: 'DEL_LISTENER', LISTENER_TYPE: 'GLOBAL', LISTENER: fn });
        };
    };
    StoreService = __decorate([
        core_1.Injectable()
    ], StoreService);
    return StoreService;
})();
exports.StoreService = StoreService;
