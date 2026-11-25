/* Vehicles, colours, mod packages and environments.
   Colour names are the real palettes on chevrolet.com and gmc.com (HUMMER EV SUV: 2026, matched to gmc.com on 24 Nov 2026); hex values are on-screen approximations.
   Clip files: media/<car>_<env>_<mod>.mp4 (all in magenta key paint, 9:16, same length).
   Until a clip exists, MEDIA_FALLBACK is used so the flow can be reviewed. */
window.GM = {
  envs: [
    { id: 'lake',   name: 'Mountain lake', thumb: 'media/env_lake.jpg' },
    { id: 'desert', name: 'Desert canyon', thumb: 'media/env_desert.jpg' },
    { id: 'coast',  name: 'Coast road',    thumb: 'media/env_coast.jpg' },
  ],
  cars: [
    {
      id: 'sierra', name: 'GMC Sierra 1500', short: 'Sierra 1500', year: 2027,
      thumb: 'media/car_sierra.jpg', logo: 'media/logo_gmc.png', cta: 'https://www.gmc.com/trucks/sierra/1500',
      testDrive: 'https://www.gmc.com/request-test-drive',
      colors: [
        { name: 'Summit White', hex: '#f1f1ed' },
        { name: 'Onyx Black', hex: '#0c0c0e' },
        { name: 'Sterling Metallic', hex: '#a7abb0' },
        { name: 'Dark Ridge Metallic', hex: '#4b4e52' },
        { name: 'Azurite Blue Metallic', hex: '#1e3d6a' },
        { name: 'Mesa Red', hex: '#8d1a1f' },
        { name: 'Coastal Dune', hex: '#b8a487' },
      ],
      mods: [
        { id: 'stock', name: 'Stock' },
        { id: 'boat', name: 'Boat in tow' },       // 20 ft centre-console boat on a trailer
        { id: 'camper', name: 'Camper in tow' },   // 22 ft aluminium travel trailer
        { id: 'overland', name: 'Overland rack' }, // bed rack, rooftop tent, recovery boards, light bar
      ],
    },
    {
      id: 'corvette', name: 'Chevrolet Corvette Grand Sport', short: 'Corvette Grand Sport', year: 2027,
      thumb: 'media/car_corvette.jpg', logo: 'media/logo_chevrolet.png', cta: 'https://www.chevrolet.com/performance/corvette',
      testDrive: 'https://www.chevrolet.com/request-test-drive',
      colors: [
        { name: 'Torch Red', hex: '#c8102e' },
        { name: 'Competition Yellow Tintcoat', hex: '#f2c200' },
        { name: 'Admiral Blue Metallic', hex: '#1b2e5c' },
        { name: 'Sebring Orange Tintcoat', hex: '#df561a' },
        { name: 'Roswell Green Metallic', hex: '#2e4939' },
        { name: 'Arctic White', hex: '#f3f3f1' },
        { name: 'Black', hex: '#0a0a0b' },
        { name: 'Blade Silver Metallic', hex: '#b3b7bb' },
      ],
      mods: [
        { id: 'stock', name: 'Stock' },
        { id: 'bronze', name: 'Bronze wheels' },          // satin bronze forged wheels
        { id: 'carbon', name: 'Carbon hood & roof' },      // exposed carbon hood, roof and mirror caps
        { id: 'stripes', name: 'Racing stripes' },
      ],
    },
    {
      id: 'hummer', name: 'GMC HUMMER EV SUV', short: 'HUMMER EV SUV', year: 2026,
      thumb: 'media/car_hummer.jpg', logo: 'media/logo_gmc.png', cta: 'https://www.gmc.com/electric/hummer-ev/suv',
      testDrive: 'https://www.gmc.com/request-test-drive',
      colors: [
        { name: 'Coastal Dune', hex: '#8d8985' },
        { name: 'Solar Orange', hex: '#c22d0e' },
        { name: 'Graphite Blue Metallic', hex: '#262e34' },
        { name: 'Interstellar White', hex: '#dfe6e8' },
        { name: 'Void Black', hex: '#0a0b0b' },
        { name: 'Meteorite Metallic', hex: '#63696d' },
        { name: 'Deep Aurora Metallic', hex: '#3e3924' },
      ],
      mods: [
        { id: 'stock', name: 'Stock' },
        { id: 'kayaks', name: 'Kayak rack' },     // roof rack with two sea kayaks
        { id: 'rooftent', name: 'Rooftop tent' }, // hard-shell rooftop tent and ladder
        { id: 'big37', name: '37" tyres' },      // 37-inch all-terrain tyres, taller stance
      ],
    },
  ],
  clip: (car, env, mod) => `media/${car}_${env}_${mod}.mp4`,
  // One grid video per vehicle: 6x2 cells of 540x960, cell = road index * 4 + package index (built by build_atlas.sh)
  atlas: (car) => `media/atlas_${car}.mp4`,
  // car silhouettes, same grid layout at half size: where pale sky reflections on the paint still count as paint
  mask: (car) => `media/mask_${car}.mp4`,
  cell(carId, envId, modId) {
    const car = this.cars.find((c) => c.id === carId);
    return this.envs.findIndex((e) => e.id === envId) * 4 + Math.max(0, car.mods.findIndex((m) => m.id === modId));
  },
};
window.MEDIA_FALLBACK = 'media/sierra_lake_stock.mp4';
