# Brain Freeze
#Synopsis

Brainfreeze takes advantage of redux architecture. That means that a lot of how Brainfreeze works is very similar to how redux, or a redux-like library works. The basic structure of Brainfreeze follows the dispatch an action => reducer => update/change state => return a new state.

Brainfreeze still follows the functional approach that redux follows, we feel that is an appropriate approach to state containers.

Where does Brainfreeze differentiate itself?

Brainfreeze saw an issue where as applications scaled, the amount of 'listeners' on the page that were reacting to a state change could become taxing on performance. Brainfreeze focuses on the developer gaining more control over their application state. We allow for this by creating a flattened state model that is able to create a mapping of the state object. By doing this we allow specific pieces of state to map to their specific listener. The listener now will only react to the changes that are neccessary to them when state is set.

Doing this, we also enabled middleware functionality for more control over the state object. By creating this model, we set out create less business logic needed in the reducers and create more room for the developer to code what they want to code, and let the library hash out the unwanted logic. We are excited to dive into the depths of what Brainfreeze can do.

#API Reference
Brainfreeze aims to provide a familiar and predictable state container.

#Installation
`npm i brain-freeze --save`

#Documentation

```CombineReducers : Accepts object of reducers in the shape of state.```

```getState : Returns state```

```dispatch : Takes in action objects and checks for lock related commands (see locked state) before running state through reducers```

```subscribe : Subscribes a listener function to state changes (globally or to a specific key path) and returns a function to unsubscribe the same listener function. In order to subscribe to a specific key path, the developer passes in a second argument after the listener, which is the string that is the key path they wish to subscribe to. This must be done in dot notation, even with arrays.```

```Lock State : By attaching a 'lockState' property to the action object upon dispatch, the dispatch method will lock the state and refuse to change state until it receives an action object with the 'unlockState' property. If the dispatch method sees the 'lockState' or 'unlockState' property it will lock or unlock state respectively, and then exit.```

```Locking Specific Keys : This gives the developer the ability to make pieces of state immutable. This is done by dispatching an action, called 'lockKeys'. If an action is dispatched to this key while it's leave of state is locked, the action will be intercepted and the change will not occur. In certain modes, like dev-mode, the console will log out that the key is locked, and will give the developer some feedback.```

# Under The Hood

```getAllKeys : Returns flattened object from nested object```

```keyPathsChanged : Takes two objects and returns object of keys from first object that are not the same in second object. Will not return keys from second object that are not in first object.```

```saveHistory : Saves a history of state in the form of an array of deep cloned, deep frozen copies.```

## Contributors
[![Image of Edward](https://avatars3.githubusercontent.com/u/10620846?v=3&s=190)](https://github.com/Eviscerare)
[![Image of Thai](https://avatars3.githubusercontent.com/u/20631126?v=3&s=190)](https://github.com/soleiluwedu)
[![Image of Ryan](https://avatars1.githubusercontent.com/u/18267769?v=3&s=190)](https://github.com/ryanbas21)
## License
MIT
