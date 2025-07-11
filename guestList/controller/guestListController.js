const Event = require('../../Host/models/Events/event');
const mongoose = require('mongoose');

exports.enableGuestList = async (req, res) => {
  console.log('enableGuestList called with eventId:', req.params.eventId, 'by user:', req.user.hostId);
  try {
    const event = await Event.findOne({ _id: req.params.eventId, hostId: req.user.hostId });
    if (!event) {
      console.log('Event not found or unauthorized');
      return res.status(404).json({ message: 'Event not found or you are not authorized' });
    }

    if (event.eventGuestEnabled) {
      console.log('Guest list already enabled');
      return res.status(400).json({ message: 'Guest list already enabled' });
    }

    const guestLink = `https://yourapp.com/guest-list/apply/${event._id}/fnjdnfjdn}`;
    event.eventGuestEnabled = true;
    event.guestLinkUrl = guestLink;
    await event.save();

    console.log('Guest list enabled, link generated:', guestLink);
    res.json({ message: 'Guest list enabled', guestLinkUrl: guestLink });
  } catch (error) {
    console.error('Error in enableGuestList:', error);
    res.status(500).json({ message: error.message });
  }
};

// 2. Artist gets guest list link
exports.getGuestListLink = async (req, res) => {
  console.log('getGuestListLink called with eventId:', req.params.eventId, 'by artist:', req.user.artistId);
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      assignedArtists: req.user.artistId,
      eventGuestEnabled: true,
    });

    if (!event) {
      console.log('Event not found or guest list not enabled or artist not assigned');
      return res.status(404).json({ message: 'Event not found, guest list not enabled, or you are not assigned' });
    }

    console.log('Returning guest link:', event.guestLinkUrl);
    res.json({ guestLinkUrl: event.guestLinkUrl });
  } catch (error) {
    console.error('Error in getGuestListLink:', error);
    res.status(500).json({ message: error.message });
  }
};

// 3. User applies for guest list
exports.applyForGuestList = async (req, res) => {
  console.log('applyForGuestList called by user:', req.user.userId, 'for eventId:', req.params.eventId);
  try {
    const event = await Event.findOne({ _id: req.params.eventId, eventGuestEnabled: true });
    if (!event) {
      console.log('Event not found or guest list not enabled');
      return res.status(404).json({ message: 'Event not found or guest list not enabled' });
    }

    const alreadyApplied = event.guestList.some((guest) => guest.userId === req.user.userId);
    if (alreadyApplied) {
      console.log('User already applied for guest list');
      return res.status(400).json({ message: 'You have already applied for the guest list' });
    }

    event.guestList.push({ userId: req.user.userId, discountLevel: null });
    console.log("eventtttt",event)
    await event.save();
    console.log('User added to guest list');
    res.json({ message: 'Applied for guest list successfully' });
  } catch (error) {
    console.error('Error in applyForGuestList:', error);
    res.status(500).json({ message: error.message });
  }
};

// 4. Artist approves guest list request
exports.approveGuestListRequest = async (req, res) => {
  const { userId, discountLevel } = req.body;
  console.log('approveGuestListRequest called by:', req.user.artistId, 'for event:', req.params.eventId, 'userId:', userId, 'discountLevel:', discountLevel);

  if (!['level1', 'level2', 'level3'].includes(discountLevel)) {
    console.log('Invalid discount level:', discountLevel);
    return res.status(400).json({ message: 'Invalid discount level' });
  }
  // const event = await Event.findById(req.params.eventId);
  // if (!event) {
  //   throw new Error('Event not found');
  // }

 

  // // Update the event by pushing the artistId to assignedArtists array
  // const updatedEvent = await Event.findByIdAndUpdate(
  //   req.params.eventId,
  //   { $push: { assignedArtists: req.user.artistId } },
  //   { new: true, runValidators: true }
  // );
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      assignedArtists: req.user.artistId,
      eventGuestEnabled: true,
    });

    if (!event) {
      console.log('Event not found or artist not authorized');
      return res.status(404).json({ message: 'Event not found, guest list not enabled, or you are not assigned' });
    }

    const guest = event.guestList.find((g) => g.userId.toString() === userId);
    if (!guest) {
      console.log('User not found in guest list');
      return res.status(404).json({ message: 'User not found in guest list' });
    }

    if (guest.discountLevel) {
      console.log('Discount level already assigned for this user');
      return res.status(400).json({ message: 'Discount level already assigned' });
    }

    guest.discountLevel = discountLevel;
    await event.save();
    console.log(`User ${userId} approved with discount level ${discountLevel}`);
    res.json({ message: `User approved with ${discountLevel} discount` });
  } catch (error) {
    console.error('Error in approveGuestListRequest:', error);
    res.status(500).json({ message: error.message });
  }
};

// 5. User views discount level
exports.getUserDiscountLevel = async (req, res) => {
  console.log('getUserDiscountLevel called for event:', req.params.eventId, 'by user:', req.user.userId);
  try {
    // Validate eventId
    if (!mongoose.Types.ObjectId.isValid(req.params.eventId)) {
      console.log('Invalid event ID:', req.params.eventId);
      return res.status(400).json({ message: 'Invalid event ID' });
    }

    // Find event with guest list enabled and not cancelled/completed
    const event = await Event.findOne({
      _id: req.params.eventId,
      eventGuestEnabled: true,
      isCancelled: false,
      isCompleted: false,
    });

    if (!event) {
      console.log('Event not found, guest list not enabled, or event is cancelled/completed');
      return res.status(404).json({
        message: 'Event not found, guest list not enabled, or event is cancelled/completed',
      });
    }

    // Find the user in the guest list
    const guest = event.guestList.find((g) => g.userId.toString() === req.user.userId);
    if (!guest || !guest.discountLevel) {
      console.log('User not found in guest list or no discount assigned');
      return res.status(404).json({
        message: 'User not found in guest list or no discount assigned',
      });
    }

    // Get discount value
    const discountValue = event.Discount[guest.discountLevel];
    if (discountValue === undefined) {
      console.log('Invalid discount level:', guest.discountLevel);
      return res.status(400).json({
        message: `Invalid discount level: ${guest.discountLevel}`,
      });
    }

    // Handle pricing for free vs paid events
    let originalPrice = null;
    let discountedPrice = null;

    if (event.ticketSetting.ticketType === 'free') {
      console.log('Event is free, no pricing applies');
      originalPrice = 0;
      discountedPrice = 0;
    } else {
      originalPrice = event.ticketSetting.price || event.budget || 0; // Fallback to budget if price is unavailable
      discountedPrice = originalPrice * (1 - discountValue / 100);
    }

    const response = {
      discountLevel: guest.discountLevel,
      discountValue,
      originalPrice,
      discountedPrice,
      isFreeEvent: event.ticketSetting.ticketType === 'free',
    };

    console.log('Returning discount data:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in getUserDiscountLevel:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// 6. Artist rejects guest list request
exports.rejectGuestListRequest = async (req, res) => {
  const { userId } = req.body;
  console.log('rejectGuestListRequest called by:', req.user.id, 'for user:', userId, 'event:', req.params.eventId);
  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      assignedArtists: req.user.id,
      eventGuestEnabled: true,
    });

    if (!event) {
      console.log('Event not found or guest list not enabled or artist not assigned');
      return res.status(404).json({ message: 'Event not found, guest list not enabled, or you are not assigned' });
    }

    const guestIndex = event.guestList.findIndex((g) => g.userId.toString() === userId);
    if (guestIndex === -1) {
      console.log('User not found in guest list');
      return res.status(404).json({ message: 'User not found in guest list' });
    }

    event.guestList.splice(guestIndex, 1);
    await event.save();
    console.log('User guest list request rejected successfully');
    res.json({ message: 'User guest list request rejected successfully' });
  } catch (error) {
    console.error('Error in rejectGuestListRequest:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getPendingGuestListRequests = async (req, res) => {
  console.log('[DEBUG] getPendingGuestListRequests called');
  console.log('[DEBUG] req.params.eventId:', req.params.eventId);
  console.log('[DEBUG] req.user.id:', req.user.artistId);

  try {
    const event = await Event.findOne({
      _id: req.params.eventId,
      assignedArtists: req.user.artistId, // Use req.user.id
      eventGuestEnabled: true,
    }).populate('guestList.userId', 'fullName');

    console.log('[DEBUG] Event Query Result:', event);

    if (!event) {
      console.log('[DEBUG] Event not found or guest list not enabled or artist not assigned');
      return res.status(404).json({ message: 'Event not found, guest list not enabled, or you are not assigned' });
    }

    const pendingRequests = event.guestList
      .filter((guest) => {
        const isValidUser = !!guest.userId; // Check if userId is not null
        const isPending = !guest.discountLevel;
        console.log('[DEBUG] Guest userId:', guest.userId?._id || guest.userId, 'isValidUser:', isValidUser, 'isPending:', isPending);
        return isValidUser && isPending;
      })
      .map((guest) => {
        const result = {
          userId: guest.userId._id.toString(),
          fullName: guest.userId.fullName || 'Unknown User', // Fallback for missing fullName
        };
        console.log('[DEBUG] Pending Guest Entry:', result);
        return result;
      });

    console.log('[DEBUG] Final Pending Requests List:', pendingRequests);

    res.json({ pendingRequests });
  } catch (error) {
    console.error('[ERROR] getPendingGuestListRequests failed:', error.message);
    res.status(500).json({ message: error.message });
  }
};

