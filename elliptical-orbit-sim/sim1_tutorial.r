#Initialize
a <- 1                  # semi-major axis
e <- 1/sqrt(2)          # eccentricity
b <- a * sqrt(1 - e^2)  # semi-minor axis
c <- e * a              # distance from the center to a focus

# Distance from a focus to the center.
x.c <- -c
y.c <- 0
z.c <- 0

# Generate a numerical sequence
u <- seq(-pi,pi, length.out=80)

# Generate x and y values.
x <- a * cos(u) - e
y <- a * sqrt(1-e^2) * sin(u)
z <- rep(0, times=80)

c.x <- a * cos(u) - c
c.y <- a * sin(u)         # Generate points for an outer circle.
c.z <- rep(0, times=80)

# Plot x & y with a line.
plot(x,y,type="l", ylim=c(-a*sin(pi/2), a*sin(pi/2)),asp=1)
points(c.x,c.y,type="l", col="green")