"use strict";

/**
 * @returns {ResourceManager}
 */
function createResourceManager() {
    
    /** @type {ResourceContainer} */
    const managedResources = {
        actions: null,
        events: null,
        frame: null,
        map: null,
        units: null,
        debug: null,
    };

    return {
        set(resources) {
            Object.entries(resources).forEach(([name, resource]) => {
                /**
                 * so this was the original idea injecting context into resources,
                 * i guess technically we don't need it anymore, but depending on
                 * if/how we expose registering user-created resources... might
                 * revisit this again -
                 * 
                 * allows resource methods to access sibling resources and
                 * other world properties ... it's a little meta.. yeah
                 * 
                 * 
                 * Object.defineProperties(resource, {
                        resources: {
                            configurable: false,
                            enumerable: false,
                            writable: false,
                            value: this,
                        },
                        world: {
                            configurable: false,
                            enumerable: false,
                            writable: false,
                            value: world,
                        },
                    });
                 */

                managedResources[name] = resource;
            });
        },
        get() {
            return managedResources;
        }
    };
}

module.exports = createResourceManager;
