'use strict';

const debugEventSilly = require('debug')('sc2:silly:EventChannel');
const shortid = require('shortid');

/** 
 * @param {World} World
 * @returns {EventChannel}
 **/
function createEventChannel({ resources }) {
    /** @type {SystemEvent[]} */
    let events = [];

    /** @type {ReaderId[]} */
    let readers = [];

    /** @type {{ [index: string]: EventType }} */
    const readerTypes = {};

    return {
        createReader(type) {
            // by default, only subscribe to agent events
            const readerType = type ? (type === 'build' || type === 'unit') ? 'agent' : type : 'agent';
            const readerId = shortid.generate();

            debugEventSilly(`new reader registered of type ${readerType}`);
            // @TODO: i think immutability is good here, but need to revisit the tax on GC
            readers = [...readers, readerId];

            // reader type is set in a separate dict for O(1) lookups during writes
            readerTypes[readerId] = readerType;
            return readerId;
        },
    
        removeReader(id) {
            readers = readers.filter(readerId => readerId === id);
        },
    
        read(readerId) {
            debugEventSilly(`all current events: ${events.map(event => event.name)}`);
            // get all events holding this readerId
            const unreadEvents = events.filter(event => event.readers.includes(readerId));
            debugEventSilly(`Reading events for ${readerId}, the following are unread: ${unreadEvents.map(event => event.name)}`);
            // remove the reader id from the event, essentially 'consuming' it
            unreadEvents.forEach(event => event.consume(readerId));

            return unreadEvents;
        },
    
        write(event, readerId) {
            const { frame } = resources.get();

            const eventType = event.type || 'agent';
            const currentFrame = frame.getGameLoop();

            const currentReaders = readers
                .filter(reader => readerId ? reader !== readerId : true)
                .filter(reader => eventType === 'all' || readerTypes[reader] === eventType);

            /**
             * @type {SystemEvent}
             * @TODO: possible future perf issues - consider mutating the given event argument + creating an
             * event prototype for consume / destroy / future implemented methods
             */
            const newEvent = {
                ...event,
                data: event.data || null,
                type: eventType,
                gameLoop: currentFrame,
                readers: currentReaders,
                consume(readerId) {
                    this.readers = this.readers.filter(r => r !== readerId);
                    debugEventSilly(`consuming ${event.name} event for ${readerId} - ${this.readers.length} readers left to consume this event.`);

                    // if there are no more readers, remove it from the event channel queue
                    if (this.readers.length <= 0) {
                        this.destroy();
                        debugEventSilly(`${event.name} event consumed, event queue length: ${events.length}`);
                    }
                },
                destroy() {
                    events = events.filter(ev => ev !== this);
                }
            };

            debugEventSilly(`New ${event.name} event with these readers: ${currentReaders}`);

            events = [
                ...events,
                newEvent,
            ];
        },
    };
}

module.exports = createEventChannel;